"use client"

import { createContext, useContext, type ReactNode } from "react"

type ForumLayoutContextValue = {
  openMembersPanel: () => void
  isGroupChannel: boolean
}

const ForumLayoutContext = createContext<ForumLayoutContextValue | null>(null)

export function ForumLayoutProvider({
  children,
  openMembersPanel,
  isGroupChannel,
}: {
  children: ReactNode
  openMembersPanel: () => void
  isGroupChannel: boolean
}) {
  return (
    <ForumLayoutContext.Provider value={{ openMembersPanel, isGroupChannel }}>
      {children}
    </ForumLayoutContext.Provider>
  )
}

export function useForumLayout() {
  return useContext(ForumLayoutContext)
}
