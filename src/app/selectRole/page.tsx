"use client"

import { selectRole } from "../login-register/action"
import { FileEdit, MessageSquare, BarChart2, Shield } from "lucide-react"
import Image from "next/image"

export default function SelectRolePage() {
  return (
    <>
      {/* Logo Space */}
      <div className="bg-[rgb(253,248,246)] p-6 flex justify-center">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-md">
          <Image 
            src="/Logo.png" 
            alt="Company Logo" 
            width={80} 
            height={80}
            priority
          />
        </div>
      </div>
      
      <div className="p-8">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Choose Your Access Level
        </h2>
        
        <div className="space-y-4">
          {/* Content Manager */}
          <form>
            <input type="hidden" name="role" value="content-manager" />
            <button
              formAction={selectRole}
              type="submit"
              className="w-full flex items-center p-4 border border-gray-300 rounded-md hover:border-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all"
            >
              <FileEdit className="text-gray-400 mr-3" size={24} />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Content Manager</div>
                <div className="text-sm text-gray-500">Create, schedule, and publish posts</div>
              </div>
            </button>
          </form>

          {/* Engagement Specialist */}
          <form>
            <input type="hidden" name="role" value="engagement-specialist" />
            <button
              formAction={selectRole}
              type="submit"
              className="w-full flex items-center p-4 border border-gray-300 rounded-md hover:border-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all"
            >
              <MessageSquare className="text-gray-400 mr-3" size={24} />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Engagement Specialist</div>
                <div className="text-sm text-gray-500">Reply to comments and manage audience interactions</div>
              </div>
            </button>
          </form>

          {/* Analytics Viewer */}
          <form>
            <input type="hidden" name="role" value="analytics-viewer" />
            <button
              formAction={selectRole}
              type="submit"
              className="w-full flex items-center p-4 border border-gray-300 rounded-md hover:border-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all"
            >
              <BarChart2 className="text-gray-400 mr-3" size={24} />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Analytics Viewer</div>
                <div className="text-sm text-gray-500">Access performance data and insights</div>
              </div>
            </button>
          </form>

          {/* Account Owner */}
          <form>
            <input type="hidden" name="role" value="account-owner" />
            <button
              formAction={selectRole}
              type="submit"
              className="w-full flex items-center p-4 border border-gray-300 rounded-md hover:border-amber-500 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all"
            >
              <Shield className="text-gray-400 mr-3" size={24} />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Account Owner</div>
                <div className="text-sm text-gray-500">Full access to manage all aspects of your social media</div>
              </div>
            </button>
          </form>
        </div>
      </div>

      <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-center text-gray-600">
          Choose a role that best describes your access needs. This determines what actions you can perform.
        </p>
      </div>
    </>
  )
}