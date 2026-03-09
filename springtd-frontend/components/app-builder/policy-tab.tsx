"use client"

import { Button } from "@/components/ui/button"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
   Settings,
   Trash2,
   Plus,
   Pencil,
   Image as ImageIcon,
   Bold,
   Italic,
   Underline,
   Strikethrough,
   AlignLeft,
   AlignCenter,
   AlignRight,
   List,
   ListOrdered,
   Link as LinkIcon,
   Maximize2,
   FileText,
   Eye,
   Megaphone,
   Type,
   ExternalLink,
   ChevronUp
} from "lucide-react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import LinkExtension from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import CharacterCount from '@tiptap/extension-character-count'
import { useCallback, useRef, useEffect, useState } from "react"
import { useAppBuilder } from "@/contexts/AppBuilderContext"
import { toast } from "sonner"

interface EditorSectionProps {
   title: string
   sectionKey: 'policySection' | 'termsSection'
}

// Reusable Editor Component
function EditorSection({ title, sectionKey }: EditorSectionProps) {
   const fileInputRef = useRef<HTMLInputElement>(null)
   const { policy, updatePolicy, saveSection, publishConfiguration, isSaving, appId } = useAppBuilder()
   const [lastSaved, setLastSaved] = useState<Date | null>(null)

   const section = policy[sectionKey]
   const initialContent = section?.content || getDefaultContent(sectionKey)

   const editor = useEditor({
      immediatelyRender: false,
      extensions: [
         StarterKit,
         UnderlineExtension,
         TextAlign.configure({
            types: ['heading', 'paragraph'],
         }),
         LinkExtension.configure({
            openOnClick: false,
         }),
         ImageExtension,
         CharacterCount,
      ],
      content: initialContent,
      editorProps: {
         attributes: {
            class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-6',
         },
      },
      onUpdate: ({ editor }) => {
         const html = editor.getHTML()
         updatePolicy({
            [sectionKey]: {
               ...section,
               title: section?.title || title,
               content: html,
            }
         })
      },
   })

   // Update editor when policy changes externally
   useEffect(() => {
      if (editor && section?.content && editor.getHTML() !== section.content) {
         editor.commands.setContent(section.content)
      }
   }, [section?.content, editor])

   const wordCount = editor?.storage.characterCount?.words?.() || 0;

   const setLink = useCallback(() => {
      const previousUrl = editor?.getAttributes('link').href
      const url = window.prompt('URL', previousUrl)

      if (url === null) return
      if (url === '') {
         editor?.chain().focus().extendMarkRange('link').unsetLink().run()
         return
      }
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
   }, [editor])

   const addImage = useCallback(() => {
      fileInputRef.current?.click()
   }, [])

   const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
         const reader = new FileReader()
         reader.onload = (event) => {
            const src = event.target?.result as string
            if (src) {
               editor?.chain().focus().setImage({ src }).run()
            }
         }
         reader.readAsDataURL(file)
      }
      // Reset input so the same file selection works again if deleted
      if (fileInputRef.current) {
         fileInputRef.current.value = ''
      }
   }, [editor])

   if (!editor) {
      return null
   }

   const getActiveBlockLabel = () => {
      if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
      if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
      if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
      return 'Paragraph';
   };

   return (
      <div className="space-y-6">
         {/* Editor Styles */}
         <style jsx global>{`
         .ProseMirror p { margin-bottom: 1em; }
         .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
         .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
         .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; }
         .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
         .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
         .ProseMirror a { color: #7C3AED; text-decoration: underline; cursor: pointer; }
       `}</style>

         {/* Header */}
         <div className="flex items-center justify-between">
            <input
               type="file"
               ref={fileInputRef}
               className="hidden"
               accept="image/*"
               onChange={handleFileChange}
            />
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <div className="flex gap-2">
               <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 hover:bg-gray-50 text-gray-500">
                  <Settings className="w-5 h-5" />
               </Button>
               <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-200 hover:bg-gray-50 text-gray-500">
                  <Trash2 className="w-5 h-5" />
               </Button>
               <Button size="icon" className="rounded-full w-10 h-10 bg-[#1F2937] hover:bg-gray-800 text-white">
                  <Plus className="w-5 h-5" />
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            {/* Main Editor Area */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm flex flex-col">
               {/* Document Title */}
               <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-lg font-medium text-gray-700">Legend Of X, Part 3</span>
                  <Pencil className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600" />
               </div>

               {/* Mode Switcher */}
               <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
                  <Button variant="outline" size="sm" className="h-8 text-xs font-medium text-gray-600 gap-2" onClick={addImage}>
                     <ImageIcon className="w-3.5 h-3.5" /> Add Media
                  </Button>
                  <div className="flex text-sm font-medium">
                     <button className="px-3 py-1 text-gray-900">Visual</button>
                     <button className="px-3 py-1 text-gray-400 hover:text-gray-600">Text</button>
                  </div>
               </div>

               {/* Toolbar */}
               <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-4 overflow-x-auto">
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 px-2 text-sm font-medium text-gray-600 gap-1 hover:bg-gray-100">
                           {getActiveBlockLabel()} <ChevronUp className="w-3 h-3 ml-1" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                           Paragraph
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                           Heading 1
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                           Heading 2
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                           Heading 3
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                  <div className="flex items-center gap-3 text-gray-500">
                     <Bold
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('bold') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                     />
                     <Italic
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('italic') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                     />
                     <Underline
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('underline') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                     />
                     <Strikethrough
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('strike') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                     />
                  </div>
                  <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                  <div className="flex items-center gap-3 text-gray-500">
                     <AlignLeft
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive({ textAlign: 'left' }) ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                     />
                     <AlignCenter
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive({ textAlign: 'center' }) ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                     />
                     <AlignRight
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive({ textAlign: 'right' }) ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                     />
                  </div>
                  <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                  <div className="flex items-center gap-3 text-gray-500">
                     <List
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('bulletList') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                     />
                     <ListOrdered
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('orderedList') ? 'text-black' : ''}`}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                     />
                  </div>
                  <div className="h-4 w-px bg-gray-200 flex-shrink-0"></div>
                  <div className="flex items-center gap-3 text-gray-500">
                     <LinkIcon
                        className={`w-4 h-4 cursor-pointer hover:text-gray-900 ${editor.isActive('link') ? 'text-black' : ''}`}
                        onClick={setLink}
                     />
                     <Maximize2 className="w-4 h-4 cursor-pointer hover:text-gray-900" />
                  </div>
               </div>

               {/* Content */}
               <div className="min-h-[400px]">
                  <EditorContent editor={editor} />
               </div>

               {/* Footer */}
               <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                  Word Count: {editor.storage.characterCount?.words?.() ?? 'N/A'}  •  Reading Time: ~{(editor.storage.characterCount?.words?.() ?? 0) / 200} min
               </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
               {/* Publish Card */}
               <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                     <span className="font-semibold text-gray-800 text-sm">Publish</span>
                     <ChevronUp className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="p-4 space-y-4">
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                           <FileText className="w-4 h-4" />
                           <span>Status: <span className="font-bold text-gray-900">Draft</span></span>
                        </div>
                        <span className="text-[#7C3AED] font-medium text-xs cursor-pointer hover:underline">Edit</span>
                     </div>
                     <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                           <Eye className="w-4 h-4" />
                           <span>Visibility: <span className="font-bold text-gray-900">Public</span></span>
                        </div>
                        <span className="text-[#7C3AED] font-medium text-xs cursor-pointer hover:underline">Edit</span>
                     </div>
                  </div>
                  <div className="px-4 py-3 bg-[#FCFCFD] border-t border-gray-100 flex justify-between gap-3">
                     <Button variant="outline" size="sm" className="flex-1 text-xs border-gray-300">Save Draft</Button>
                     <Button size="sm" className="flex-1 text-xs bg-[#7C3AED] hover:bg-[#6D28D9] text-white">Publish</Button>
                  </div>
               </div>

               {/* Format Card */}
               <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                     <span className="font-semibold text-gray-800 text-sm">Format</span>
                     <ChevronUp className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="p-4 space-y-3">
                     <div className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-2 text-gray-700">
                           <Megaphone className="w-4 h-4 text-gray-400" />
                           <span className="text-sm">Standard</span>
                        </div>
                        <div className="w-4 h-4 rounded-full border-[5px] border-[#7C3AED]"></div>
                     </div>
                     <div className="flex items-center justify-between cursor-pointer group opacity-60 hover:opacity-100">
                        <div className="flex items-center gap-2 text-gray-700">
                           <Type className="w-4 h-4 text-gray-400" />
                           <span className="text-sm">Aside</span>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                     </div>
                     <div className="flex items-center justify-between cursor-pointer group opacity-60 hover:opacity-100">
                        <div className="flex items-center gap-2 text-gray-700">
                           <ExternalLink className="w-4 h-4 text-gray-400" />
                           <span className="text-sm">Link</span>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   )
}

function getDefaultContent(sectionKey: string): string {
   if (sectionKey === 'policySection') {
      return `
      <h3>Privacy Policy</h3>
      <p>Enter your privacy policy content here...</p>
    `
   }
   return `
    <h3>Terms of Service</h3>
    <p>Enter your terms of service content here...</p>
  `
}

export function PolicyTab() {
   return (
      <div className="space-y-16 py-6 pb-20">
         <EditorSection title="Privacy Policy" sectionKey="policySection" />
         <EditorSection title="Terms of Service" sectionKey="termsSection" />
      </div>
   )
}
