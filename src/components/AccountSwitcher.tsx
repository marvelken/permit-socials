'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, User, UserCog } from 'lucide-react'

interface Account {
  id: string
  full_name: string
  email: string
  isOwn: boolean
  access_level?: string
}

interface AccountSwitcherProps {
  accounts: Account[]
  currentAccount: Account | null
  onSwitch: (account: Account) => void
}

export default function AccountSwitcher({ accounts, currentAccount, onSwitch }: AccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (account: Account) => {
    onSwitch(account)
    setIsOpen(false)
  }

  if (!accounts || accounts.length === 0 || !currentAccount) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        {currentAccount.isOwn ? (
          <User size={18} className="text-gray-600" />
        ) : (
          <UserCog size={18} className="text-amber-600" />
        )}
        <span className="font-medium">
          {currentAccount.isOwn ? 'My Account' : currentAccount.full_name}
        </span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-72 bg-white rounded-md shadow-lg border border-gray-200 py-1">
          <div className="py-1 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
            Select Account
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => handleSelect(account)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center ${
                  currentAccount.id === account.id ? 'bg-amber-50' : ''
                }`}
              >
                <div className="mr-2">
                  {account.isOwn ? (
                    <User size={18} className="text-gray-600" />
                  ) : (
                    <UserCog size={18} className="text-amber-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {account.isOwn ? 'My Account' : account.full_name}
                    {currentAccount.id === account.id && (
                      <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{account.email}</div>
                  {!account.isOwn && (
                    <div className="text-xs text-amber-600 mt-0.5">
                      {account.access_level || 'Manager'}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}