'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { 
  useAdminCategories, 
  useCreateCategory, 
  useUpdateCategory, 
  useDeleteCategory 
} from '@/hooks/useAdmin'
import { Plus, X, Loader2, Info, Edit2, Trash2, Upload } from 'lucide-react'
import api from '@/lib/api'

export default function AdminCategories() {
  const { data: categories, isLoading, refetch } = useAdminCategories()
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()
  const deleteMutation = useDeleteCategory()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: ''
  })

  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true)
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      
      const res = await api.post('/upload/product-image', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (res.data?.success && res.data?.data?.url) {
        setFormData(prev => ({ ...prev, imageUrl: res.data.data.url }))
      } else {
        alert('Upload failed')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error uploading file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      alert('Only image files are allowed')
      return
    }
    
    await uploadFile(file)
  }

  const openAddModal = () => {
    setSelectedCategory(null)
    setFormData({ name: '', description: '', imageUrl: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (cat: any) => {
    setSelectedCategory(cat)
    setFormData({
      name: cat.name,
      description: cat.description || '',
      imageUrl: cat.imageUrl || ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this category? This might affect products using it.')) {
      deleteMutation.mutate(id, {
        onSuccess: () => refetch()
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-generate slug from name
    const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')

    const payload = {
      name: formData.name,
      slug,
      description: formData.description,
      imageUrl: formData.imageUrl || undefined
    }

    if (selectedCategory) {
      updateMutation.mutate(
        { id: selectedCategory.id, data: payload },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setFormData({ name: '', description: '', imageUrl: '' })
            refetch()
          }
        }
      )
    } else {
      createMutation.mutate(
        payload,
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setFormData({ name: '', description: '', imageUrl: '' })
            refetch()
          }
        }
      )
    }
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-2 uppercase tracking-wide">Categories</h1>
            <p className="text-xs text-muted-text uppercase tracking-widest">Organize products into groups</p>
          </div>
          <button 
            onClick={openAddModal}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/80 smooth-transition flex items-center gap-2 text-xs tracking-wider uppercase cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-secondary-text">Loading categories...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories?.map((cat: any) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden border border-border bg-card/25 hover:border-primary/45 smooth-transition flex flex-col justify-between"
              >
                {/* Category Image Cover */}
                <div className="relative h-40 w-full bg-secondary/50 overflow-hidden group">
                  {cat.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={cat.imageUrl} 
                      alt={cat.name} 
                      className="w-full h-full object-cover group-hover:scale-105 smooth-transition" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-text/30 p-4 border-b border-border/40">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">No Cover Image</span>
                    </div>
                  )}
                  
                  {/* Floating Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-2 bg-background/85 hover:bg-primary hover:text-white text-primary-text rounded-md smooth-transition cursor-pointer shadow-lg"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-2 bg-background/85 hover:bg-red-600 hover:text-white text-primary-text rounded-md smooth-transition cursor-pointer shadow-lg"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-primary-text uppercase tracking-wide mb-2">{cat.name}</h3>
                    <p className="text-xs text-muted-text leading-relaxed line-clamp-3">
                      {cat.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-text uppercase font-bold tracking-widest">
                    <span>Slug: {cat.slug}</span>
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Active
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            {categories?.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-text uppercase tracking-widest text-[10px] border border-dashed border-border p-6">
                No categories available. Add one above.
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-popover border border-border p-6 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <h3 className="font-bold text-sm uppercase tracking-widest text-primary-text">
                  {selectedCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-text hover:text-primary-text smooth-transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary-text uppercase tracking-wider">Category Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border text-primary-text focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary-text uppercase tracking-wider">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-secondary border border-border text-primary-text focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>

                {/* Image Upload Zone */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary-text uppercase tracking-wider">Category Image</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : formData.imageUrl 
                          ? 'border-border/60 bg-secondary/20' 
                          : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {formData.imageUrl ? (
                      <div className="space-y-3">
                        <div className="relative w-full h-32 mx-auto overflow-hidden rounded-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData(prev => ({ ...prev, imageUrl: '' }))
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full smooth-transition z-10"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-text">Drag & drop or click to replace</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {isUploading ? (
                          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-text mx-auto" />
                        )}
                        <p className="text-[11px] font-medium text-primary-text">
                          {isUploading ? 'Uploading to Cloudinary...' : 'Drag & drop image here or click to select'}
                        </p>
                        <p className="text-[9px] text-muted-text uppercase tracking-wider">Supports PNG, JPG, JPEG, WEBP</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="category-image-file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFile(file);
                      }}
                    />
                    <label
                      htmlFor="category-image-file"
                      className="absolute inset-0 cursor-pointer z-0"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 border border-border text-primary-text hover:bg-secondary smooth-transition uppercase tracking-widest text-[10px] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending || isUploading}
                    className="px-6 py-2.5 bg-primary text-white hover:bg-primary/95 smooth-transition uppercase tracking-widest text-[10px] font-bold flex items-center gap-2 cursor-pointer"
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {selectedCategory ? 'Save Changes' : 'Create Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>

  )
}
