'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import Link from 'next/link'
import { useSettings } from '@/context/SettingsContext'
import { CreditCard, ShoppingBag, CheckCircle, ArrowRight, Loader2, MapPin, Phone } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'

interface CartItem {
  id: string
  name: string
  slug: string
  price: number
  image: string
  category: string
  quantity: number
}

export default function CheckoutPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOrdered, setIsOrdered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'COD'>('CARD')
  const [codChargeVal, setCodChargeVal] = useState<number>(50)
  const [isLocating, setIsLocating] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new')
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  })

  const handleSelectSavedAddress = (addr: any) => {
    setSelectedAddressId(addr.id)
    setFormData(prev => ({
      ...prev,
      address: addr.street || '',
      city: addr.city || '',
      postalCode: addr.postalCode || '',
      phone: addr.phone || '',
    }))
  }

  const handleAddNewAddressClick = () => {
    setSelectedAddressId('new')
    setFormData(prev => ({
      ...prev,
      address: '',
      city: '',
      postalCode: '',
      phone: '',
    }))
  }
  
  const { formatPrice } = useSettings()
  const { user, setUser } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const items = JSON.parse(localStorage.getItem('cart') || '[]')
      setCartItems(items)
      setIsLoaded(true)
    }

    // Fetch COD settings
    api.get('/settings')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setCodChargeVal(res.data.data.codCharge ?? 50)
        }
      })
      .catch(err => console.error('Error fetching settings:', err))
  }, [])

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || '',
      }))

      // Fetch saved addresses and prefill the default one
      api.get('/addresses')
        .then(res => {
          const addresses = res.data.data
          if (addresses && addresses.length > 0) {
            setSavedAddresses(addresses)
            const defAddr = addresses.find((a: any) => a.isDefault) || addresses[0]
            setSelectedAddressId(defAddr.id)
            setFormData(prev => ({
              ...prev,
              address: defAddr.street || '',
              city: defAddr.city || '',
              postalCode: defAddr.postalCode || '',
              phone: defAddr.phone || '',
            }))
          }
        })
        .catch(err => console.error('Error fetching addresses:', err))
    }
  }, [user])

  // Pincode auto-lookup
  useEffect(() => {
    const pincode = formData.postalCode.trim()
    if (/^\d{6}$/.test(pincode)) {
      fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0]
            if (postOffice) {
              const city = postOffice.District || postOffice.Name || ''
              setFormData(prev => ({
                ...prev,
                city: city,
              }))
            }
          }
        })
        .catch(err => console.error('Error looking up pincode:', err))
    }
  }, [formData.postalCode])

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'Skulture-ECommerce-App'
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.address) {
              const addr = data.address
              const streetParts = [
                addr.road,
                addr.suburb,
                addr.neighbourhood,
                addr.city_district
              ].filter(Boolean)
              const street = streetParts.join(', ') || data.display_name || ''
              const city = addr.city || addr.town || addr.village || addr.municipality || ''
              const postalCode = addr.postcode || ''
              
              setFormData(prev => ({
                ...prev,
                address: street,
                city: city || prev.city,
                postalCode: postalCode || prev.postalCode
              }))
            }
          })
          .catch(err => console.error('Error in reverse geocoding:', err))
          .finally(() => setIsLocating(false))
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to retrieve your location')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // If the user starts editing shipping address fields, switch selection to 'new'
    if (['address', 'city', 'postalCode', 'phone'].includes(name)) {
      setSelectedAddressId('new')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 1. Sync local cart items to the database cart
      await api.delete('/cart/clear')
      for (const item of cartItems) {
        await api.post('/cart/items', {
          productId: item.id,
          quantity: item.quantity
        })
      }

      // 2. Resolve address ID
      let addressId = selectedAddressId
      if (selectedAddressId === 'new') {
        const addressRes = await api.post('/addresses', {
          street: formData.address,
          city: formData.city,
          state: 'N/A',
          postalCode: formData.postalCode,
          country: 'India',
          phone: formData.phone || undefined,
          isDefault: false,
          isActive: saveAddressToProfile // If user wants to save to profile, it's active. Otherwise false (temporary/hidden).
        })
        addressId = addressRes.data.data.id
      }

      // 3. Create the order
      await api.post('/orders', {
        addressId,
        paymentMethod
      })

      // 3.5 Refresh profile data to clear stamps/discount in context
      try {
        const userRes = await api.get('/auth/me')
        if (userRes.data?.success && userRes.data?.data) {
          setUser(userRes.data.data)
        }
      } catch (e) {
        console.error('Error refreshing profile:', e)
      }

      // 4. Clear local storage cart
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cart')
        window.dispatchEvent(new Event('cart-updated'))
      }
      setIsOrdered(true)
    } catch (err: any) {
      console.error('Checkout error:', err)
      setSubmitError(
        err.response?.data?.message || 
        'An error occurred while placing your order. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const hasDiscount = user?.loyaltyDiscountSet && user?.loyaltyDiscountValue > 0
  const discountRate = hasDiscount ? user.loyaltyDiscountValue : 0
  const discountAmount = hasDiscount ? (subtotal * (discountRate / 100)) : 0
  const discountedSubtotal = subtotal - discountAmount
  const tax = discountedSubtotal * 0.1
  const codCharge = paymentMethod === 'COD' ? codChargeVal : 0
  const total = discountedSubtotal + tax + codCharge

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
        <Navbar />
        <div className="pt-32 pb-12 container mx-auto px-4 md:px-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-8 bg-secondary rounded w-48" />
            <div className="h-4 bg-secondary rounded w-32" />
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (isOrdered) {
    return (
      <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
        <Navbar />
        <div className="pt-32 pb-12 md:pb-16 text-center">
          <div className="container mx-auto px-4 md:px-6 max-w-md py-16">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-border rounded-xl p-8 flex flex-col items-center gap-6 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="heading-3 text-primary-text font-bold">Order Confirmed!</h2>
                <p className="text-secondary-text text-sm mt-2">
                  Thank you for your purchase. We have sent an email confirmation to <span className="text-primary font-medium">{formData.email}</span>.
                </p>
              </div>
              <Link
                href="/products"
                className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 smooth-transition uppercase text-xs tracking-wider font-bold cursor-pointer text-center"
              >
                Continue Shopping
              </Link>
            </motion.div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-primary-text transition-colors duration-300">
      <Navbar />

      <div className="pt-32 pb-12 border-b border-border">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="heading-2 text-primary-text">Checkout</h1>
        </div>
      </div>

      <div className="py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          {cartItems.length === 0 ? (
            <motion.div
              className="text-center py-16 max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-secondary-text mb-8 text-lg">Your cart is empty. Please add items before checking out.</p>
              <Link
                href="/products"
                className="inline-block px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 smooth-transition uppercase text-xs tracking-wider font-bold cursor-pointer"
              >
                Continue Shopping
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Shipping Info */}
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-bold text-lg text-primary-text border-b border-border pb-3">Shipping Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block mb-1">Full Name</label>
                        <input
                          type="text"
                          name="fullName"
                          required
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block mb-1">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                          placeholder="johndoe@example.com"
                        />
                      </div>
                      {savedAddresses.length > 0 && (
                        <div className="sm:col-span-2 space-y-3 mb-2">
                          <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block">Deliver to Saved Address</label>
                          <div className="grid grid-cols-1 gap-3">
                            {savedAddresses.map((addr) => (
                              <div
                                key={addr.id}
                                onClick={() => handleSelectSavedAddress(addr)}
                                className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                  selectedAddressId === addr.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border bg-secondary hover:border-border/80'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="selectedAddress"
                                      checked={selectedAddressId === addr.id}
                                      onChange={() => handleSelectSavedAddress(addr)}
                                      className="accent-primary"
                                    />
                                    <span className="text-xs font-bold text-primary-text capitalize">{formData.fullName}</span>
                                    {addr.isDefault && (
                                      <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Default</span>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-secondary-text mt-2 pl-5 space-y-1">
                                  <p>{addr.street}</p>
                                  <p>{addr.city}, {addr.postalCode}</p>
                                  <p className="flex items-center gap-1 mt-1 text-[11px]"><Phone className="w-3 h-3" /> {addr.phone || 'N/A'}</p>
                                </div>
                              </div>
                            ))}
                            <div
                              onClick={handleAddNewAddressClick}
                              className={`p-4 border rounded-xl cursor-pointer transition-all ${
                                selectedAddressId === 'new'
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border bg-secondary hover:border-border/80'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="selectedAddress"
                                  checked={selectedAddressId === 'new'}
                                  onChange={handleAddNewAddressClick}
                                  className="accent-primary"
                                />
                                <span className="text-xs font-bold text-primary-text">Add / Deliver to a new address</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedAddressId === 'new' && (
                        <>
                          <div className="sm:col-span-2">
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block">Address</label>
                              <button
                                type="button"
                                onClick={handleGeolocation}
                                disabled={isLocating}
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold cursor-pointer disabled:opacity-50"
                              >
                                {isLocating ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" /> Locating...
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-3.5 h-3.5" /> Locate Me
                                  </>
                                )}
                              </button>
                            </div>
                            <input
                              type="text"
                              name="address"
                              required
                              value={formData.address}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                              placeholder="123 Street Name"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block mb-1">Phone Number</label>
                            <input
                              type="tel"
                              name="phone"
                              required
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                              placeholder="e.g. +91 98765 43210"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block mb-1">City</label>
                            <input
                              type="text"
                              name="city"
                              required
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                              placeholder="Mumbai"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-secondary-text uppercase tracking-wider block mb-1">Postal Code (Pincode)</label>
                            <input
                              type="text"
                              name="postalCode"
                              required
                              value={formData.postalCode}
                              onChange={handleInputChange}
                              className="w-full px-4 py-2 bg-secondary border border-border focus:border-primary rounded-lg text-primary-text focus:outline-none text-sm transition-all"
                              placeholder="400001"
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                            <input
                              type="checkbox"
                              id="saveAddressToProfile"
                              checked={saveAddressToProfile}
                              onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                              className="rounded border-gray-300 dark:border-gray-750 text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-primary"
                            />
                            <label htmlFor="saveAddressToProfile" className="text-xs font-bold text-secondary-text cursor-pointer select-none uppercase tracking-wider">
                              Save address to my profile for future orders
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                    <h3 className="font-bold text-lg text-primary-text border-b border-border pb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> Payment Method
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                      <div
                        onClick={() => setPaymentMethod('CARD')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === 'CARD'
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-secondary hover:border-border/80'
                        }`}
                      >
                        <CreditCard className="w-6 h-6 mb-2 text-primary" />
                        <span className="text-sm font-semibold text-primary-text font-bold">Pay Online</span>
                      </div>
                      <div
                        onClick={() => setPaymentMethod('COD')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          paymentMethod === 'COD'
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-secondary hover:border-border/80'
                        }`}
                      >
                        <ShoppingBag className="w-6 h-6 mb-2 text-primary" />
                        <span className="text-sm font-semibold text-primary-text font-bold">Cash on Delivery</span>
                      </div>
                    </div>

                    {paymentMethod === 'CARD' ? (
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg text-sm text-secondary-text">
                        Pay securely online using <span className="font-bold text-primary-text">Razorpay</span> (supports UPI, Cards, Netbanking, and Wallets).
                      </div>
                    ) : (
                      <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg text-sm text-secondary-text">
                        You will pay for your order in cash upon delivery. A standard COD handling charge of <span className="font-bold text-primary-text">{formatPrice(codChargeVal)}</span> will be added to your total.
                      </div>
                    )}
                  </div>

                  {submitError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary/95 text-white font-semibold rounded-lg smooth-transition uppercase text-xs tracking-wider font-bold cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order ({formatPrice(total)}) <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Order Summary Panel */}
              <div>
                <div className="bg-card border border-border rounded-xl p-6 sticky top-28 space-y-6">
                  <h3 className="font-bold text-lg text-primary-text pb-4 border-b border-border flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-primary" /> Order Summary
                  </h3>

                  <div className="max-h-60 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded bg-secondary border border-border" />
                          <div>
                            <p className="text-xs font-bold text-primary-text line-clamp-1">{item.name}</p>
                            <p className="text-[10px] text-muted-text">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-primary-text">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between text-secondary-text text-xs">
                      <span>Subtotal</span>
                      <span className="font-medium text-primary-text">{formatPrice(subtotal)}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-green-500 text-xs font-bold">
                        <span>Loyalty Discount ({discountRate}%)</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-secondary-text text-xs">
                      <span>Estimated Tax</span>
                      <span className="font-medium text-primary-text">{formatPrice(tax)}</span>
                    </div>
                    <div className="flex justify-between text-secondary-text text-xs">
                      <span>Shipping</span>
                      <span className="text-green-500 font-medium">Free</span>
                    </div>
                    {paymentMethod === 'COD' && (
                      <div className="flex justify-between text-secondary-text text-xs">
                        <span>COD Handling Charge</span>
                        <span className="font-medium text-primary-text">{formatPrice(codChargeVal)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-4 flex justify-between font-bold text-sm text-primary-text">
                      <span>Grand Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

