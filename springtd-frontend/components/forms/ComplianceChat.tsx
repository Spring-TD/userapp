"use client"

import { useState } from "react"
import { ChevronDown, Paperclip, ImageIcon, Type, Send, Star, User } from "lucide-react"
import { TbMessageCancel } from "react-icons/tb"
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
    avatars: ["#60A5FA", "#EF4444", "#7C3AED"],
  },
  {
    id: "2",
    sender: "From Admin",
    preview: "Application errors...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#7C3AED", "#1F2937", "#EF4444"],
  },
  {
    id: "3",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#60A5FA", "#EF4444", "#7C3AED"],
  },
]

const mockChatMessages: ChatMessage[] = [
  {
    id: "1",
    text: "Thank you. Please enter the amount and date of the transaction (eg 100, December 21th).",
    sender: "admin",
    timestamp: "13:34",
  },
  { id: "2", text: "$50, November 30th", sender: "user", timestamp: "13:34" },
  { id: "3", text: "Speaking to a Representative", sender: "user", timestamp: "13:34" },
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
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Left messages column */}
      <div className="w-80 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Messages</h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mockMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => setSelectedMessage(message)}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedMessage?.id === message.id ? "bg-gray-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex -space-x-2">
                  {message.avatars.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                      style={{ backgroundColor: color }}
                    >
                      A
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{message.sender}</span>
                    <span className="text-xs text-gray-500">{message.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{message.preview}</p>
                </div>

                {message.starred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      {selectedMessage ? (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7C3AED] rounded-full flex items-center justify-center text-white font-medium">
                G
              </div>
              <div>
                <div className="font-medium text-gray-900">Grace Ife</div>
                <div className="text-sm text-gray-500">Product Approval</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 flex items-center gap-2">
                <TbMessageCancel className="w-4 h-4" /> 
                Close
              </button>

              <button className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50">
                <User className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockChatMessages.map((message) => (
              <div key={message.id}>
                {message.isSystemMessage ? (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      Chat got taken over by customer service
                    </div>
                  </div>
                ) : (
                  <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] ${message.sender === "user" ? "bg-[#7C3AED] text-white" : "bg-gray-100 text-gray-900"} rounded-lg p-3`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <div className={`text-xs mt-1 ${message.sender === "user" ? "text-white/70" : "text-gray-500"}`}>
                        {message.timestamp}
                      </div>
                    </div>

                    {message.sender === "admin" && (
                      <button className="ml-2 text-gray-400 hover:text-gray-600">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-center">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                Chat got taken over by customer service
              </div>
            </div>
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-gray-200">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="w-full pl-12 pr-[240px] py-4 min-h-[150px] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] text-sm resize-none border border-gray-200"
              />

              {/* Left icons */}
              <div className="absolute left-3 top-4 flex flex-col gap-2">
                <button className="text-gray-400 hover:text-gray-600">
                  <Paperclip className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <Type className="w-5 h-5" />
                </button>
              </div>

              {/* Right buttons */}
              <div className="absolute right-3 bottom-4 flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[#7C3AED] border-[#7C3AED] hover:bg-[#7C3AED] hover:text-white bg-transparent"
                >
                  Assign to Form
                </Button>
                <Button size="sm" className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
          <p className="text-gray-500">Select a message to view conversation</p>
        </div>
      )}
    </div>
  )
}
