'use client'

import { useState, FormEvent } from 'react'
import { UserPlus, X, Mail, Loader2, Check } from 'lucide-react'
import { createClient } from '../../utils/supabase/client'

interface ManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManagerModal({ isOpen, onClose }: ManagerModalProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  
  if (!isOpen) return null

  const handleAddManager = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)
    setDebugInfo(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Step 1: Check if the account_access table exists
      console.log("Checking account_access table")
      const { error: tableCheckError } = await supabase
        .from('account_access')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.error("Error checking account_access table:", tableCheckError)
        setDebugInfo({ tableCheckError })
        throw new Error('The account_access table might not be set up correctly. Please check console for details.')
      }

      // Step 2: Check if relationship already exists
      console.log("Checking for existing relationship")
      const { data: existingAccess, error: checkError } = await supabase
        .from('account_access')
        .select('*')
        .eq('account_owner_id', user.id)
        .eq('manager_email', email.toLowerCase())
        .maybeSingle()

      if (checkError) {
        console.error("Error checking existing access:", checkError)
        setDebugInfo({ checkError })
        throw new Error('Error checking existing relationship. Please check console for details.')
      }

      if (existingAccess) {
        throw new Error('You already have a manager relationship with this email')
      }

      // Step 3: Try to find the user ID if possible
      console.log("Looking up user profile")
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle()

      if (profileError) {
        console.log("Profile lookup error (non-fatal):", profileError)
      }

      console.log("Found profile:", profileData)

      // Step 4: Create new account access record with minimal required fields
      console.log("Creating account access record")
      const insertData = {
        account_owner_id: user.id,
        manager_email: email.toLowerCase(),
        access_level: 'content-manager'
      }

      // Only add manager_id if we found a profile
      if (profileData?.id) {
        insertData['manager_id'] = profileData.id
      }

      console.log("Insert data:", insertData)
      
      const { error: accessError } = await supabase
        .from('account_access')
        .insert([insertData])

      if (accessError) {
        console.error('Error inserting record:', accessError)
        setDebugInfo({ insertData, accessError })
        throw new Error(`Database error: ${accessError.message || 'Unknown error'}`)
      }

      setSuccess(true)
      setEmail('')
      setTimeout(() => {
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error('Error adding manager:', err)
      setError(err.message || 'Failed to add manager')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          disabled={submitting}
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
            <UserPlus className="mr-2" size={24} />
            Add Content Manager
          </h2>
          
          <p className="text-gray-600 mb-6">
            Add someone who can create posts and reply to comments on your behalf. 
            Enter their email address below.
          </p>
          
          {error && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="p-3 mb-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-center">
              <Check size={16} className="mr-2" />
              Successfully added manager!
            </div>
          )}
          
          {debugInfo && (
            <div className="p-3 mb-4 bg-gray-50 border border-gray-200 rounded-md overflow-auto max-h-40">
              <p className="text-xs font-mono">Debug Info:</p>
              <pre className="text-xs font-mono mt-1">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
          
          <form onSubmit={handleAddManager}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@example.com"
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  disabled={submitting}
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:bg-amber-400 flex items-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={18} />
                    Adding...
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