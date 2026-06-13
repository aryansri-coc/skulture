'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import Link from 'next/link'
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Loader2, 
  Phone, 
  ShieldCheck, 
  User as UserIcon, 
  ShoppingBag, 
  CreditCard, 
  ChevronRight, 
  Gift, 
  Tag, 
  Star, 
  Bell, 
  Lock,
  LogOut
} from 'lucide-react'
import { useSendPhoneOtp, useVerifyPhoneOtp, useDeleteAccount } from '@/hooks/useAuth'

interface Address {
  id: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

type TabType = 'profile' | 'addresses' | 'upi' | 'cards' | 'coupons' | 'reviews' | 'notifications'

export default function AccountPage() {
  const { user, logout, setUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  // Profile Edit States
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('Male')
  const [editPersonal, setEditPersonal] = useState(false)
  const [editEmail, setEditEmail] = useState(false)
  const [editMobile, setEditMobile] = useState(false)

  // Phone Verification States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const sendOtpMutation = useSendPhoneOtp()
  const verifyOtpMutation = useVerifyPhoneOtp()
  const deleteAccountMutation = useDeleteAccount()

  const [addressForm, setAddressForm] = useState({
    street: '',
    city: '',
    state: 'N/A',
    postalCode: '',
    country: 'India',
    phone: '',
    isDefault: false
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Postal code auto-lookup
  useEffect(() => {
    const pincode = addressForm.postalCode.trim()
    if (/^\d{6}$/.test(pincode)) {
      fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        .then(res => res.json())
        .then(data => {
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0]
            if (postOffice) {
              const city = postOffice.District || postOffice.Name || ''
              const state = postOffice.State || ''
              setAddressForm(prev => ({
                ...prev,
                city: city || prev.city,
                state: state || prev.state,
              }))
            }
          }
        })
        .catch(err => console.error('Error looking up pincode:', err))
    }
  }, [addressForm.postalCode])

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
              const state = addr.state || ''
              const country = addr.country || 'India'
              
              setAddressForm(prev => ({
                ...prev,
                street: street,
                city: city || prev.city,
                postalCode: postalCode || prev.postalCode,
                state: state || prev.state,
                country: country || prev.country
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

  // Sync profile values when user loads
  useEffect(() => {
    if (user) {
      const parts = (user.name || '').trim().split(/\s+/)
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
      setEmail(user.email || '')
      setPhoneInput(user.phone || '')
    }
  }, [user])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  // Fetch addresses on mount/tab change
  const fetchAddresses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/addresses')
      setAddresses(res.data.data || [])
    } catch (err) {
      console.error('Error fetching addresses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'addresses') {
      fetchAddresses()
    }
  }, [activeTab, fetchAddresses])

  // Fetch unread support replies (Notifications)
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([])
      return
    }
    setNotificationsLoading(true)
    try {
      const res = await api.get('/inquiries/my')
      if (res.data?.success && res.data?.data) {
        const unread = res.data.data.filter((inq: any) => {
          if (inq.status === 'RESOLVED') return false
          const lastMsg = inq.messages?.[0]
          return lastMsg && lastMsg.senderRole === 'ADMIN'
        })
        setNotifications(unread)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setNotificationsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Save personal info (name, gender)
  const handleSavePersonalInfo = async () => {
    try {
      setLoading(true)
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      const res = await api.patch('/users/profile', { name: fullName })
      if (res.data?.success && res.data?.data) {
        setUser({ ...user, ...res.data.data })
        setEditPersonal(false)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update personal info.')
    } finally {
      setLoading(false)
    }
  }

  // Save email info
  const handleSaveEmail = async () => {
    try {
      setLoading(true)
      const res = await api.patch('/users/profile', { email: email.trim() })
      if (res.data?.success && res.data?.data) {
        setUser({ ...user, ...res.data.data })
        setEditEmail(false)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update email.')
    } finally {
      setLoading(false)
    }
  }

  // Phone OTP Flow
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await sendOtpMutation.mutateAsync(phoneInput)
      setOtpSent(true)
      setCooldown(60)
      setSuccessMsg('Verification OTP has been sent via SMS.')
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      await verifyOtpMutation.mutateAsync({ phone: phoneInput, otp: otpInput })
      setSuccessMsg('Phone number verified successfully!')
      
      const res = await api.get('/auth/me')
      if (res.data?.success && res.data?.data) {
        setUser(res.data.data)
      }
      
      setTimeout(() => {
        setIsModalOpen(false)
        setOtpSent(false)
        setOtpInput('')
        setSuccessMsg(null)
        setEditMobile(false)
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid or expired OTP. Please try again.')
    }
  }

  // Addresses CRUD
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const openAddForm = () => {
    setEditingAddress(null)
    setAddressForm({
      street: '',
      city: '',
      state: 'N/A',
      postalCode: '',
      country: 'India',
      phone: '',
      isDefault: false
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const openEditForm = (addr: Address) => {
    setEditingAddress(addr)
    setAddressForm({
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: (addr as any).phone || '',
      isDefault: addr.isDefault
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (addressForm.street.length < 5) {
      setFormError('Street address must be at least 5 characters long')
      return
    }
    if (addressForm.city.length < 2) {
      setFormError('City must be at least 2 characters long')
      return
    }
    if (addressForm.postalCode.length < 4) {
      setFormError('Postal code must be at least 4 characters long')
      return
    }

    try {
      if (editingAddress) {
        await api.patch(`/addresses/${editingAddress.id}`, addressForm)
      } else {
        await api.post('/addresses', addressForm)
      }
      setIsFormOpen(false)
      fetchAddresses()
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save address. Please try again.')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return
    try {
      await api.delete(`/addresses/${id}`)
      fetchAddresses()
    } catch (err) {
      console.error('Error deleting address:', err)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.patch(`/addresses/${id}/default`)
      fetchAddresses()
    } catch (err) {
      console.error('Error setting default address:', err)
    }
  }

  return (
    <main className="min-h-screen bg-[#f1f3f6] dark:bg-[#0b0c10] text-[#1f2833] dark:text-[#c5c6c7] font-sans smooth-transition relative overflow-hidden">
      <Navbar />

      <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-28 pb-16">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="w-full lg:w-1/4 flex flex-col gap-4">
            
            {/* User Profile Card */}
            <div className="bg-white dark:bg-[#12131a] border border-[#e0e0e0] dark:border-[#1f2833]/30 p-4 flex items-center gap-4 rounded shadow-sm">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-600 to-orange-500 flex items-center justify-center text-white font-extrabold text-xl shadow select-none">
                {user?.name?.slice(0, 1).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Hello,</p>
                <h2 className="text-sm font-bold text-black dark:text-white capitalize">{user?.name || 'User'}</h2>
              </div>
            </div>

            {/* Navigation Card */}
            <div className="bg-white dark:bg-[#12131a] border border-[#e0e0e0] dark:border-[#1f2833]/30 rounded shadow-sm text-xs">
              
              {/* My Orders Section */}
              <Link 
                href="/orders" 
                className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-red-500" />
                  <span>My Orders</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>

              {/* Account Settings Section */}
              <div className="border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 p-4 pb-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <UserIcon className="w-4 h-4 text-red-500" />
                  <span>Account Settings</span>
                </div>
                <div className="flex flex-col pb-2 pl-11">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'profile' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    Profile Information
                  </button>
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'addresses' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    Manage Addresses
                  </button>
                </div>
              </div>

              {/* Payments Section */}
              <div className="border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 p-4 pb-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-red-500" />
                  <span>Payments</span>
                </div>
                <div className="flex flex-col pb-2 pl-11">
                  <Link
                    href="/rewards"
                    className="py-2 text-left font-semibold flex items-center justify-between pr-4 text-gray-700 dark:text-gray-300 hover:text-red-500 smooth-transition"
                  >
                    <span>Gift Cards</span>
                    <span className="text-green-600 font-bold">₹0</span>
                  </Link>
                  <button
                    onClick={() => setActiveTab('upi')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'upi' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    Saved UPI
                  </button>
                  <button
                    onClick={() => setActiveTab('cards')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'cards' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    Saved Cards
                  </button>
                </div>
              </div>

              {/* My Stuff Section */}
              <div className="border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 p-4 pb-2 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <Gift className="w-4 h-4 text-red-500" />
                  <span>My Stuff</span>
                </div>
                <div className="flex flex-col pb-2 pl-11">
                  <Link
                    href="/custom-requests"
                    className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300 hover:text-red-500 smooth-transition"
                  >
                    Custom Projects
                  </Link>
                  <Link
                    href="/wishlist"
                    className="py-2 text-left font-semibold text-gray-700 dark:text-gray-300 hover:text-red-500 smooth-transition"
                  >
                    Wishlist
                  </Link>
                  <button
                    onClick={() => setActiveTab('coupons')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'coupons' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    My Coupons
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-2 text-left font-semibold smooth-transition ${
                      activeTab === 'reviews' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    My Reviews & Ratings
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`py-2 text-left font-semibold flex items-center justify-between pr-4 smooth-transition ${
                      activeTab === 'notifications' 
                        ? 'text-red-600 dark:text-red-400 font-bold' 
                        : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                    }`}
                  >
                    <span>All Notifications</span>
                    {notifications.length > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px] font-black animate-pulse">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Logout & Account Actions */}
              <div className="p-2 flex flex-col gap-1 bg-gray-50/50 dark:bg-black/10">
                <button
                  onClick={logout}
                  className="flex items-center gap-3 p-3 text-red-600 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-950/20 smooth-transition rounded cursor-pointer w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>

            </div>
          </div>

          {/* RIGHT CONTENT PANEL */}
          <div className="w-full lg:w-3/4 bg-white dark:bg-[#12131a] border border-[#e0e0e0] dark:border-[#1f2833]/30 p-6 md:p-8 rounded shadow-sm text-xs">
            
            {/* DYNAMIC TAB VIEW */}
            
            {/* 1. PROFILE INFORMATION */}
            {activeTab === 'profile' && (
              <div className="space-y-10">
                
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-black dark:text-white">Personal Information</h3>
                    <button 
                      onClick={() => {
                        if (editPersonal) {
                          // reset name states from user object
                          const parts = (user?.name || '').trim().split(/\s+/)
                          setFirstName(parts[0] || '')
                          setLastName(parts.slice(1).join(' ') || '')
                        }
                        setEditPersonal(!editPersonal)
                      }} 
                      className="text-red-500 font-bold hover:underline"
                    >
                      {editPersonal ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
                    <input
                      type="text"
                      disabled={!editPersonal}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First Name"
                      className="px-4 py-3 border border-[#e0e0e0] dark:border-gray-800 rounded bg-gray-50/50 dark:bg-[#0b0c10] text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-black/20 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:border-red-500 text-xs"
                    />
                    <input
                      type="text"
                      disabled={!editPersonal}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last Name"
                      className="px-4 py-3 border border-[#e0e0e0] dark:border-gray-800 rounded bg-gray-50/50 dark:bg-[#0b0c10] text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-black/20 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold block">Your Gender</span>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-black dark:text-white">
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          disabled={!editPersonal}
                          checked={gender === 'Male'}
                          onChange={() => setGender('Male')}
                          className="w-4 h-4 text-red-600 focus:ring-0 accent-red-600"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-black dark:text-white">
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          disabled={!editPersonal}
                          checked={gender === 'Female'}
                          onChange={() => setGender('Female')}
                          className="w-4 h-4 text-red-600 focus:ring-0 accent-red-600"
                        />
                        <span>Female</span>
                      </label>
                    </div>
                  </div>

                  {editPersonal && (
                    <button
                      onClick={handleSavePersonalInfo}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded uppercase tracking-wider transition cursor-pointer"
                    >
                      Save
                    </button>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-black dark:text-white">Email Address</h3>
                    <button 
                      onClick={() => {
                        if (editEmail) setEmail(user?.email || '')
                        setEditEmail(!editEmail)
                      }} 
                      className="text-red-500 font-bold hover:underline"
                    >
                      {editEmail ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="max-w-xl">
                    <input
                      type="email"
                      disabled={!editEmail}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full px-4 py-3 border border-[#e0e0e0] dark:border-gray-800 rounded bg-gray-50/50 dark:bg-[#0b0c10] text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-black/20 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  {editEmail && (
                    <button
                      onClick={handleSaveEmail}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded uppercase tracking-wider transition cursor-pointer"
                    >
                      Save
                    </button>
                  )}
                </div>

                {/* Mobile Number */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-black dark:text-white">Mobile Number</h3>
                    <button 
                      onClick={() => setEditMobile(!editMobile)} 
                      className="text-red-500 font-bold hover:underline"
                    >
                      {editMobile ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="max-w-xl flex items-center gap-3">
                    <input
                      type="tel"
                      disabled={!editMobile}
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Mobile Number"
                      className="w-full px-4 py-3 border border-[#e0e0e0] dark:border-gray-800 rounded bg-gray-50/50 dark:bg-[#0b0c10] text-black dark:text-white disabled:bg-gray-100 dark:disabled:bg-black/20 disabled:text-gray-500 disabled:cursor-not-allowed focus:outline-none focus:border-red-500 text-xs"
                    />
                    
                    {user?.isPhoneVerified && !editMobile && (
                      <span className="flex-shrink-0 flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[9px]">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}

                    {!user?.isPhoneVerified && !editMobile && (
                      <span className="flex-shrink-0 flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded font-bold uppercase tracking-wider text-[9px]">
                        ⚠️ Unverified
                      </span>
                    )}
                  </div>

                  {editMobile && (
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded uppercase tracking-wider transition cursor-pointer"
                    >
                      Verify with OTP
                    </button>
                  )}
                </div>

                {/* FAQ Section */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-4">
                  <h4 className="text-sm font-bold text-black dark:text-white">FAQs</h4>
                  <div className="space-y-4 text-xs text-gray-600 dark:text-gray-400">
                    <div>
                      <p className="font-bold text-black dark:text-white mb-1">What happens when I update my email address (or mobile number)?</p>
                      <p className="leading-relaxed">Your login email id (or mobile number) changes, likewise. You'll receive all your account related communication on your updated email address (or mobile number).</p>
                    </div>
                    <div>
                      <p className="font-bold text-black dark:text-white mb-1">When will my Skulture account be updated with the new email address?</p>
                      <p className="leading-relaxed">It happens instantly. Once you verify your new details, your profile changes are persisted directly to our systems.</p>
                    </div>
                    <div>
                      <p className="font-bold text-black dark:text-white mb-1">Can I link multiple mobile numbers to my account?</p>
                      <p className="leading-relaxed">No. You can only link a single verified mobile number to your account to maintain safety and delivery notifications consistency.</p>
                    </div>
                  </div>
                </div>

                {/* Deactivation zone */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Deactivate Account</h4>
                    <p className="text-gray-500 mb-3">Permanently delete your profile, addresses, and saved items from our catalog.</p>
                    <button
                      onClick={async () => {
                        if (confirm('Are you absolutely sure you want to permanently delete your account? This action is irreversible.')) {
                          try {
                            await deleteAccountMutation.mutateAsync()
                            alert('Your account has been deleted successfully.')
                          } catch (err: any) {
                            alert(err.response?.data?.message || 'Failed to delete account.')
                          }
                        }
                      }}
                      disabled={deleteAccountMutation.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition cursor-pointer uppercase tracking-wider flex items-center gap-1.5"
                    >
                      {deleteAccountMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Delete Account
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* 2. MANAGE ADDRESSES */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-base font-bold text-black dark:text-white">Manage Addresses</h3>
                    <p className="text-[11px] text-gray-500">Configure your shipping and billing destinations</p>
                  </div>
                  {!isFormOpen && (
                    <button
                      onClick={openAddForm}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded smooth-transition cursor-pointer shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Add Address
                    </button>
                  )}
                </div>

                {/* Form to Add/Edit Address */}
                {isFormOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gray-50/50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded"
                  >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-800">
                      <h4 className="font-bold text-xs text-black dark:text-white uppercase tracking-wider">
                        {editingAddress ? 'Edit Address' : 'Add New Address'}
                      </h4>
                      <button 
                        onClick={() => setIsFormOpen(false)}
                        className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveAddress} className="space-y-4">
                      {formError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded font-medium">
                          {formError}
                        </div>
                      )}
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">Street Address</label>
                          <button
                            type="button"
                            onClick={handleGeolocation}
                            disabled={isLocating}
                            className="flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {isLocating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Locating...
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
                          name="street"
                          required
                          value={addressForm.street}
                          onChange={handleAddressInputChange}
                          className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                          placeholder="e.g. 123 Main Road, Apt 4B"
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Phone Number</label>
                        <input
                          type="text"
                          name="phone"
                          required
                          value={addressForm.phone}
                          onChange={handleAddressInputChange}
                          className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                          placeholder="e.g. +91 98765 43210"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">City</label>
                          <input
                            type="text"
                            name="city"
                            required
                            value={addressForm.city}
                            onChange={handleAddressInputChange}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                            placeholder="e.g. Mumbai"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Postal Code</label>
                          <input
                            type="text"
                            name="postalCode"
                            required
                            value={addressForm.postalCode}
                            onChange={handleAddressInputChange}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                            placeholder="e.g. 400001"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">State</label>
                          <input
                            type="text"
                            name="state"
                            required
                            value={addressForm.state}
                            onChange={handleAddressInputChange}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                            placeholder="e.g. Maharashtra"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1">Country</label>
                          <input
                            type="text"
                            name="country"
                            required
                            value={addressForm.country}
                            onChange={handleAddressInputChange}
                            className="w-full px-3 py-2.5 bg-white dark:bg-[#0b0c10] border border-gray-200 dark:border-gray-800 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                            placeholder="e.g. India"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="isDefault"
                          name="isDefault"
                          checked={addressForm.isDefault}
                          onChange={handleAddressInputChange}
                          className="rounded border-gray-300 dark:border-gray-700 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer accent-red-600"
                        />
                        <label htmlFor="isDefault" className="text-xs font-semibold text-black dark:text-white cursor-pointer select-none">
                          Set as default delivery address
                        </label>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          className="px-4 py-2 border border-[#e0e0e0] dark:border-gray-800 text-black dark:text-white font-bold rounded hover:bg-gray-50 dark:hover:bg-gray-800 smooth-transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded smooth-transition cursor-pointer"
                        >
                          Save Address
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex items-center gap-2 text-gray-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    <span>Loading addresses...</span>
                  </div>
                )}

                {/* List of addresses */}
                {!loading && addresses.length === 0 ? (
                  <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500">
                    No saved addresses found. Add an address for future orders.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {addresses.map((addr) => (
                      <div 
                        key={addr.id} 
                        className={`p-4 bg-gray-50/30 dark:bg-black/10 border rounded flex flex-col justify-between gap-4 smooth-transition ${
                          addr.isDefault ? 'border-red-500 shadow-sm' : 'border-gray-200 dark:border-gray-850 hover:border-red-500/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-black dark:text-white capitalize">
                              {user?.name || 'Customer Address'}
                            </span>
                            {addr.isDefault && (
                              <span className="flex items-center gap-1 text-[9px] bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                <Check className="w-3 h-3" /> Default
                              </span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-3 space-y-1">
                            <p>{addr.street}</p>
                            <p>{addr.city}, {addr.state} {addr.postalCode}</p>
                            <p>{addr.country}</p>
                            {(addr as any).phone && <p className="text-gray-400 dark:text-gray-500 font-semibold mt-1">Phone: {(addr as any).phone}</p>}
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80 pt-3 mt-2">
                          {!addr.isDefault ? (
                            <button
                              onClick={() => handleSetDefault(addr.id)}
                              className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer uppercase tracking-wider"
                            >
                              Set as Default
                            </button>
                          ) : (
                            <span />
                          )}
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditForm(addr)}
                              className="p-1.5 border border-gray-200 dark:border-gray-800 hover:border-red-500 text-gray-500 hover:text-red-500 rounded smooth-transition cursor-pointer"
                              title="Edit Address"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(addr.id)}
                              className="p-1.5 border border-gray-200 dark:border-gray-800 hover:border-red-500 text-gray-500 hover:text-red-500 rounded smooth-transition cursor-pointer"
                              title="Delete Address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'upi' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-black dark:text-white">Saved UPI Accounts</h3>
                <p className="text-gray-600 dark:text-gray-400">Configure your default UPI VPA tags for faster checkouts.</p>
                <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500">
                  No saved UPI IDs found.
                </div>
              </div>
            )}

            {activeTab === 'cards' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-black dark:text-white">Saved Cards</h3>
                <p className="text-gray-600 dark:text-gray-400">Safely manage your credit/debit card details in compliance with standard bank regulations.</p>
                <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500">
                  No saved payment cards found.
                </div>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-black dark:text-white">My Coupons</h3>
                <p className="text-gray-600 dark:text-gray-400">Active vouchers and promo codes applicable to checkout.</p>
                <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500">
                  No discount coupons currently available.
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-black dark:text-white">My Reviews & Ratings</h3>
                <p className="text-gray-600 dark:text-gray-400">View and update ratings you gave to 3D print catalog products.</p>
                <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500">
                  You haven't submitted any reviews yet.
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-base font-bold text-black dark:text-white">All Notifications</h3>
                    <p className="text-[11px] text-gray-500 font-semibold tracking-wide">Track delivery milestones, support replies, and account updates</p>
                  </div>
                  <button 
                    onClick={fetchNotifications}
                    className="text-xs font-bold text-red-500 hover:underline"
                    disabled={notificationsLoading}
                  >
                    {notificationsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>

                {notificationsLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 border border-dashed border-gray-300 dark:border-gray-800 rounded text-center text-gray-500 font-medium">
                    No new notifications or support replies.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {notifications.map((inq: any) => (
                      <Link
                        key={inq.id}
                        href="/dashboard"
                        className="text-left p-4 hover:bg-gray-50 dark:hover:bg-secondary/40 rounded border border-gray-200 dark:border-gray-800 transition-colors flex flex-col gap-1.5"
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-red-500 uppercase tracking-wide">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                            Support Reply
                          </span>
                          <span>{new Date(inq.updatedAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-black dark:text-white font-bold">{inq.subject}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal">{inq.messages?.[0]?.message}</p>
                        <span className="text-[10px] text-red-500 hover:underline font-bold mt-2 self-start">
                          View details on your Dashboard →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      <Footer />

      {/* Phone Verification Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#12131a] border border-[#eaeaea] dark:border-[#1f2833]/60 rounded p-6 shadow-xl text-black dark:text-white text-xs"
            >
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setOtpSent(false)
                  setErrorMsg(null)
                  setSuccessMsg(null)
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-base font-extrabold text-black dark:text-white mb-2 uppercase tracking-wide">Verify Phone Number</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-6">
                Enter your phone number in E.164 format (e.g. +919876543210) to verify your identity.
              </p>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded font-medium">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded font-medium">
                  {successMsg}
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+919876543210"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0b0c10] border border-gray-200 dark:border-[#1f2833]/60 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendOtpMutation.isPending}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {sendOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : 'Send Verification OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                      OTP sent to <span className="font-bold text-black dark:text-white">{phoneInput}</span>
                    </p>
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#0b0c10] border border-gray-200 dark:border-[#1f2833]/60 rounded text-black dark:text-white focus:outline-none focus:border-red-500 text-xs tracking-[0.2em] font-mono text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyOtpMutation.isPending}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {verifyOtpMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : 'Verify OTP'}
                  </button>

                  <div className="flex justify-between items-center text-xs mt-4">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-gray-500 hover:text-black dark:hover:text-white font-medium cursor-pointer"
                    >
                      ← Edit Number
                    </button>

                    <button
                      type="button"
                      disabled={cooldown > 0 || sendOtpMutation.isPending}
                      onClick={handleSendOtp}
                      className={`font-semibold cursor-pointer ${
                        cooldown > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'
                      }`}
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}
