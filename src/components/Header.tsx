'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, User, BarChart2, Home, MessageSquare } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login-register')
  }

  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/SocialsDashboard" className="flex items-center">
            <div className="w-10 h-10 bg-[rgb(253,248,246)]  flex items-center justify-center overflow-hidden shadow-sm">
              <Image 
                src="/Logo.png" 
                alt="Company Logo" 
                width={32} 
                height={32}
                priority
              />
            </div>
            <span className="ml-2 font-semibold text-gray-800">Permit Socials</span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/SocialsDashboard" className="flex items-center text-gray-600 hover:text-amber-600">
              <Home size={18} className="mr-1" />
              <span>Dashboard</span>
            </Link>
            <Link href="/posts" className="flex items-center text-gray-600 hover:text-amber-600">
              <MessageSquare size={18} className="mr-1" />
              <span>Posts</span>
            </Link>
            <Link href="#" className="flex items-center text-gray-600 hover:text-amber-600">
              <BarChart2 size={18} className="mr-1" />
              <span>Analytics</span>
            </Link>
          </nav>

          {user && (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center text-gray-700 hover:text-amber-600"
              >
                <User size={20} className="mr-1" />
                <span className="hidden md:inline">{user.email}</span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
            <Link href="/login-register" className="text-amber-600 hover:text-amber-700">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}