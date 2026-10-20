"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  ChevronDown,
  Paperclip,
  Smile,
  ImageIcon,
  Type,
  Send,
  Star,
  MessageCircle,
  MoreVertical,
  FileText,
  Bold,
  Italic,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import UnderlineExtension from "@tiptap/extension-underline"
import ImageExtension from "@tiptap/extension-image"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "react-toastify"

export interface ChatMessage {
  id: string
  text: string
  sender: "user" | "admin"
  timestamp: string
  isSystemMessage?: boolean
}

export interface Thread {
  id: string
  sender: string
  preview: string
  date: string
  starred: boolean
  avatars: string[]
  messages: ChatMessage[]
}

const initialThreads: Thread[] = [
  {
    id: "1",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: true,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
    messages: [
      { id: "1", text: "Thank you. Please enter the amount and date of the transaction (eg 100, December 21th).", sender: "admin", timestamp: "13:34" },
      { id: "2", text: "$50, November 30th", sender: "user", timestamp: "13:34" },
      { id: "3", text: "Speaking to a Representative", sender: "user", timestamp: "13:34" },
      { id: "5", text: "Chat got taken over by customer service", sender: "admin", timestamp: "13:34", isSystemMessage: true },
      { id: "4", text: "Hi, this is Alex from Customer Support. I see you're having an issue with your top-up.", sender: "admin", timestamp: "13:34" },
    ],
  },
  {
    id: "2",
    sender: "From Admin",
    preview: "Application errors...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#9A813F", "#1F2937", "#EF4444"],
    messages: [
      { id: "a1", text: "We're looking into the application errors you reported.", sender: "admin", timestamp: "14:00" },
      { id: "a2", text: "Thanks, let me know when you have an update.", sender: "user", timestamp: "14:02" },
    ],
  },
  {
    id: "3",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
    messages: [
      { id: "b1", text: "Your product submission is under review.", sender: "admin", timestamp: "12:00" },
    ],
  },
  {
    id: "4",
    sender: "From Admin",
    preview: "Application errors...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#9A813F", "#1F2937", "#EF4444"],
    messages: [
      { id: "c1", text: "Need help with the integration.", sender: "user", timestamp: "11:30" },
      { id: "c2", text: "Our team will reach out shortly.", sender: "admin", timestamp: "11:35" },
    ],
  },
  {
    id: "5",
    sender: "From Admin",
    preview: "Product Approval...",
    date: "Oct 14 2025",
    starred: false,
    avatars: ["#60A5FA", "#EF4444", "#9A813F"],
    messages: [],
  },
]

const EMOJIS = ["😀", "👍", "❤️", "🙏", "✅", "📎", "📅", "😊", "🎉", "⚠️"]

function formatTime() {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
}

export function ComplianceChatTab() {
  const [threads, setThreads] = useState<Thread[]>(() =>
    initialThreads.map((t) => ({ ...t, messages: [...t.messages] }))
  )
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialThreads[0]?.id ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      UnderlineExtension,
      ImageExtension,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "min-h-[80px] max-h-[200px] px-4 py-3 text-sm focus:outline-none prose prose-sm max-w-none",
      },
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedThread?.messages])

  const toggleStar = useCallback((threadId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, starred: !t.starred } : t))
    )
  }, [])

  const sendMessage = useCallback(() => {
    if (!selectedThreadId || !editor) return
    const html = editor.getHTML()
    const text = editor.getText().trim()
    if (!text && !html.replace(/<p><\/p>/g, "").trim()) return
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      sender: "user",
      timestamp: formatTime(),
    }
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThreadId
          ? { ...t, messages: [...t.messages, msg], preview: text.slice(0, 50) + (text.length > 50 ? "..." : "") }
          : t
      )
    )
    editor.commands.clearContent()
    toast.success("Message sent")
  }, [selectedThreadId, editor])

  const addAttachment = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && editor) {
        editor.chain().focus().insertContent(` [Attachment: ${file.name}] `).run()
        toast.info(`Added: ${file.name}`)
      }
      e.target.value = ""
    },
    [editor]
  )

  const onImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file && editor) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const src = ev.target?.result as string
          editor.chain().focus().setImage({ src }).run()
          toast.info("Image added")
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ""
    },
    [editor]
  )

  const insertEmoji = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run()
    },
    [editor]
  )

  const insertDate = useCallback(() => {
    const str = new Date().toLocaleDateString(undefined, { dateStyle: "medium" })
    editor?.chain().focus().insertContent(str).run()
  }, [editor])

  const assignToForm = useCallback(() => {
    toast.info("Assign to form — connect to your form flow when ready.")
  }, [])

  return (
    <div className="flex gap-6 h-[calc(100vh-280px)]">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="*"
        onChange={onFileSelect}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={onImageSelect}
      />

      {/* Messages List */}
      <div className="w-[400px] bg-white rounded-lg border border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => setSelectedThreadId(thread.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                selectedThreadId === thread.id ? "bg-[#FFF9EA]" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex -space-x-2">
                  {thread.avatars.map((color, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: color }}
                    >
                      A
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{thread.sender}</span>
                    <span className="text-xs text-gray-500">{thread.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{thread.preview || "No messages yet"}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => toggleStar(thread.id, e)}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label={thread.starred ? "Unstar" : "Star"}
                >
                  {thread.starred ? (
                    <Star className="w-5 h-5 flex-shrink-0 fill-[#9A813F] text-[#9A813F]" />
                  ) : (
                    <Star className="w-5 h-5 flex-shrink-0 text-gray-400 stroke-[1.5]" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat View */}
      {selectedThread ? (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col relative min-w-0">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://www.shutterstock.com/image-photo/portrait-black-woman-smile-arms-600nw-2329488115.jpg" alt="Grace Ife" />
                <AvatarFallback>G</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">Grace Ife</p>
                <p className="text-sm text-gray-600">Product Approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg">Close</Button>
              <button type="button" className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button type="button" className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 text-gray-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {selectedThread.messages.map((message) => (
              <div key={message.id}>
                {message.isSystemMessage ? (
                  <div className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 text-xs px-4 py-2 rounded-full">
                      Chat got taken over by customer service
                    </div>
                  </div>
                ) : (
                  <div className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {message.sender === "admin" && message.id === "4" && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64" alt="Alex" />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-3 ${
                        message.sender === "user" ? "bg-[#9A813F] text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === "user" ? "text-gray-500" : "text-white/80"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                type="button"
                className="bg-[#9A813F] text-white hover:bg-[#8A7335] rounded-lg"
              >
                Retry Checking the Balance
              </Button>
              <Button
                type="button"
                className="bg-[#9A813F] text-white hover:bg-[#8A7335] rounded-lg"
              >
                Speak to a Representative
              </Button>
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Rich text input */}
          <div className="p-4 border-t border-gray-200">
            <div className="rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-[#9A813F] focus-within:border-transparent bg-white">
              <EditorContent editor={editor} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={addAttachment}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Insert image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Insert emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="start">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl p-1.5 rounded hover:bg-gray-100"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${editor?.isActive("bold") ? "bg-gray-100 text-[#9A813F]" : "text-gray-500 hover:text-gray-700"}`}
                  title="Bold"
                >
                  <Bold className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${editor?.isActive("italic") ? "bg-gray-100 text-[#9A813F]" : "text-gray-500 hover:text-gray-700"}`}
                  title="Italic"
                >
                  <Italic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded-lg hover:bg-gray-100 ${editor?.isActive("underline") ? "bg-gray-100 text-[#9A813F]" : "text-gray-500 hover:text-gray-700"}`}
                  title="Underline"
                >
                  <Type className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={insertDate}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Insert date"
                >
                  <Calendar className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 bg-white border-gray-300"
                  onClick={assignToForm}
                >
                  <FileText className="w-4 h-4" />
                  Assign to Form
                </Button>
                <Button
                  type="button"
                  className="bg-[#9A813F] text-white hover:bg-[#8A7335] gap-2"
                  onClick={sendMessage}
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6">
            <button
              type="button"
              className="relative w-14 h-14 bg-[#9A813F] text-white rounded-full shadow-lg hover:bg-[#8A7335] flex items-center justify-center"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                1
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-lg border border-gray-200 flex items-center justify-center min-w-0">
          <p className="text-gray-500">Select a message to view conversation</p>
        </div>
      )}
    </div>
  )
}
