"use client"

import { useEditor, EditorContent, Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Undo,
  Redo,
  Smile,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface RichTextEditorProps {
  value: string
  onChange: (html: string, markdown: string) => void
  placeholder?: string
  className?: string
}

const EMOJI_CATEGORIES = [
  {
    name: "Common",
    emojis: ["👋", "👍", "🙌", "💪", "🔥", "⭐", "✨", "🎉", "🏆", "🥇", "🥈", "🥉", "🤼", "💰", "📧", "📅", "⏰", "✅", "❌", "⚠️", "ℹ️", "❤️", "💙", "💛"]
  },
  {
    name: "Wrestling",
    emojis: ["🤼", "🤼‍♂️", "🤼‍♀️", "🏅", "🎖️", "🏟️", "💪", "🦵", "🦶", "🩹", "🏋️", "🏋️‍♂️", "🏋️‍♀️", "🥋", "🎯", "📊", "📈", "🗓️"]
  },
  {
    name: "Celebration",
    emojis: ["🎉", "🎊", "🥳", "🎈", "🎁", "🏆", "👏", "🙏", "💯", "🎯", "🌟", "⚡", "💥", "🚀", "📣", "🔔", "👀", "🤩"]
  }
]

function MenuBar({ editor }: { editor: Editor | null }) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")

  const setLink = useCallback(() => {
    if (!editor) return
    
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      setShowLinkInput(false)
      return
    }

    let url = linkUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run()

    setLinkUrl("")
    setShowLinkInput(false)
  }, [editor, linkUrl])

  const insertEmoji = useCallback((emoji: string) => {
    if (!editor) return
    editor.chain().focus().insertContent(emoji).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border rounded-t-md bg-gray-50 border-b-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-gray-200")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-gray-200")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 2 }) && "bg-gray-200")}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-gray-200")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-gray-200")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-gray-300 mx-1" />

      {showLinkInput ? (
        <div className="flex items-center gap-1">
          <Input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-8 w-48 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                setLink()
              } else if (e.key === "Escape") {
                setShowLinkInput(false)
                setLinkUrl("")
              }
            }}
            autoFocus
          />
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={setLink}>
            <Link2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setShowLinkInput(false); setLinkUrl("") }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-gray-200")}
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run()
            } else {
              const previousUrl = editor.getAttributes("link").href
              setLinkUrl(previousUrl || "")
              setShowLinkInput(true)
            }
          }}
          title="Add link"
        >
          <Link2 className="h-4 w-4" />
        </Button>
      )}

      <div className="w-px h-6 bg-gray-300 mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Insert emoji">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="space-y-3">
            {EMOJI_CATEGORIES.map((category) => (
              <div key={category.name}>
                <p className="text-xs font-medium text-gray-500 mb-1">{category.name}</p>
                <div className="flex flex-wrap gap-1">
                  {category.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-lg"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  )
}

/** Convert TipTap HTML to simplified markdown for blast-format compatibility */
function htmlToMarkdown(html: string): string {
  if (!html) return ""
  
  let md = html
  
  // Convert headings
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
  
  // Convert bold
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**")
  
  // Convert italic
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*")
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*")
  
  // Convert links
  md = md.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
  
  // Convert lists
  md = md.replace(/<ul[^>]*>/gi, "")
  md = md.replace(/<\/ul>/gi, "")
  md = md.replace(/<ol[^>]*>/gi, "")
  md = md.replace(/<\/ol>/gi, "")
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n")
  
  // Convert paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
  
  // Remove remaining tags
  md = md.replace(/<br\s*\/?>/gi, "\n")
  md = md.replace(/<[^>]+>/g, "")
  
  // Clean up
  md = md.replace(/&nbsp;/g, " ")
  md = md.replace(/&amp;/g, "&")
  md = md.replace(/&lt;/g, "<")
  md = md.replace(/&gt;/g, ">")
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/\n{3,}/g, "\n\n")
  
  return md.trim()
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[#003366] underline",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Write your message...",
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const markdown = htmlToMarkdown(html)
      onChange(html, markdown)
    },
  })

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div className={cn("border rounded-md bg-white", className)}>
      <MenuBar editor={editor} />
      <EditorContent 
        editor={editor} 
        className="[&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:px-4 [&_.ProseMirror]:py-3 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_a]:text-[#003366] [&_.ProseMirror_a]:underline"
      />
    </div>
  )
}
