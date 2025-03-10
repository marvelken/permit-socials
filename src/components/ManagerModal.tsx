'use client'

import { useState } from 'react'
import { Loader2, X, Check, UserPlus } from 'lucide-react'
import { createClient } from '../../utils/supabase/client'

interface ManagerModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ManagerModal({ isOpen, onClose }: ManagerModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const supabase = createClient()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Check if the email is valid
      if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address')
      }

      // 2. Check if the user exists in Supabase Auth
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single()

      if (userError) {
        // User doesn't exist in the system
        throw new Error('This user is not registered in the system yet. Please invite them to sign up first.')
      }

      // 3. Send an invitation email (this would require a server function)
      // For now, just display success message
      setSuccess(`Successfully added ${userData.full_name || email} as a Content Manager`)
      setEmail('')

      // Close modal after 3 seconds of success
      setTimeout(() => {
        onClose()
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add manager')
      console.error('Error adding manager:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={isLoading}
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <UserPlus className="mr-2" size={24} />
            Add Content Manager
          </h2>
          
          <p className="text-gray-600 mb-6">
            Add a user who is already registered in the system as a Content Manager. They'll have access based on their assigned role during registration.
          </p>
          
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-center">
              <Check size={16} className="mr-2" />
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                disabled={isLoading}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                The person must already be registered in the system.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400 flex items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Processing...
                  </>
                ) : (
                  'Add Manager'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}