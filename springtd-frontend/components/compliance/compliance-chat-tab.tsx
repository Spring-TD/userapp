"use client"

import { useState } from "react"
import { ChevronDown, Paperclip, Smile, ImageIcon, Type, Send, Star } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  sender: string
  preview: string
  date: string
  starred: boolean
  avatars: string[]
}

interface ChatMessage {
  id: string
  text: string
  sender: "user" | "admin"
  timestamp: string
  isSystemMessage?: boolean
}

const mockMessages: Message[] = [
  {
    id: "1",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: true,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
  },
  {
    id: "2",
    sender: "From Admin",
    preview: "Application errors...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#9A813F", "#1F2937", "#EF4444"],
  },
  {
    id: "3",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
  },
  {
    id: "4",
    sender: "From Admin",
    preview: "Application errors...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#9A813F", "#1F2937", "#EF4444"],
  },
  {
    id: "5",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
  },
]

const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Thank you. Please enter the amount and date of the transaction (eg 100, December 21th).",
    sender: "admin",
    timestamp: "13:34",
  },
  {
    id: "2",
    text: "$50, November 30th",
    sender: "user",
    timestamp: "13:34",
  },
  {
    id: "3",
    text: "Speaking to a Representative",
    sender: "user",
    timestamp: "13:34",
  },
  {
    id: "4",
    text: "Hi, this is Alex from Customer Support. I see you're having an issue with your top-up.",
    sender: "admin",
    timestamp: "13:34",
  },
]

export function ComplianceChatTab() {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(mockMessages[0])
  const [inputValue, setInputValue] = useState("")

  return (
    <div className="flex gap-6 h-[calc(100vh-280px)]">
      {/* Messages List */}
      <div className="w-[400px] bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mockMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedMessage?.id === message.id ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar Group */}
                <div className="flex -space-x-2">
                  {message.avatars.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: color }}
                    >
                      A
                    </div>
                  ))}
                </div>

                {/* Message Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{message.sender}</span>
                    <span className="text-xs text-gray-500">{message.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{message.preview}</p>
                </div>

                {/* Star Icon */}
                <Star
                  className={`w-5 h-5 flex-shrink-0 ${
                    message.starred ? "fill-[#9A813F] text-[#9A813F]" : "text-gray-400"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat View */}
      {selectedMessage ? (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg"
                alt="Grace Ife"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Grace Ife</p>
                <p className="text-sm text-gray-600">Product Approval</p>
              </div>
            </div>

            <Button variant="outline" className="gap-2 bg-transparent">
              <ChevronDown className="w-4 h-4" />
              Close
            </Button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {mockChatMessages.map((message) => (
              <div key={message.id}>
                {message.isSystemMessage ? (
                  <div className="flex justify-center">
                    <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2 rounded-full">
                      Chat got taken over by customer service
                    </div>
                  </div>
                ) : (
                  <div className={`flex ${message.sender === "user" ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.sender === "user" ? "bg-gray-100 text-gray-900" : "bg-[#9A813F] text-white"
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === "user" ? "text-gray-500" : "text-white/80"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                    {message.sender === "admin" && (
                      <img
                        src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg"
                        alt="Admin"
                        className="w-8 h-8 rounded-full object-cover ml-2"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" className="bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Retry Checking the Balance
              </Button>
              <Button variant="outline" className="bg-[#9A813F] text-white hover:bg-[#8A7335]">
                Speak to a Representative
              </Button>
            </div>

            {/* System Message */}
            <div className="flex justify-center">
              <div className="bg-blue-50 text-blue-700 text-xs px-4 py-2 rounded-full">
                Chat got taken over by customer service
              </div>
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-3">
              <input
                type="text"
                placeholder='Type "/" to use template message'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9A813F] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="text-gray-500 hover:text-gray-700">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Smile className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Type className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" className="gap-2 bg-transparent">
                  <Paperclip className="w-4 h-4" />
                  Assign to Form
                </Button>
                <Button className="bg-[#9A813F] text-white hover:bg-[#8A7335] gap-2">
                  Send
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Floating Action Button */}
          <button className="absolute bottom-8 right-8 w-14 h-14 bg-[#9A813F] text-white rounded-full shadow-lg hover:bg-[#8A7335] flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
          <p className="text-gray-500">Select a message to view conversation</p>
        </div>
      )}
    </div>
  )
}
