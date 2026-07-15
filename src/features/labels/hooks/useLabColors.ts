import { useMemo } from 'react'

export interface LabColor {
  fg: string
  bg: string
}

export const LAB_PALETTE: LabColor[] = [
  { fg: '#1D4ED8', bg: '#DBEAFE' },
  { fg: '#7C3AED', bg: '#EDE9FE' },
  { fg: '#B45309', bg: '#FEF3C7' },
  { fg: '#0F766E', bg: '#CCFBF1' },
  { fg: '#BE185D', bg: '#FCE7F3' },
  { fg: '#DC2626', bg: '#FEE2E2' },
  { fg: '#065F46', bg: '#D1FAE5' },
  { fg: '#0369A1', bg: '#E0F2FE' },
  { fg: '#9A3412', bg: '#FFEDD5' },
  { fg: '#6D28D9', bg: '#EDE9FE' },
]

export function useLabColors(labs: string[]): Map<string, LabColor> {
  return useMemo(() => {
    const unique = Array.from(new Set(labs)).sort()
    return new Map(unique.map((lab, i) => [lab, LAB_PALETTE[i % LAB_PALETTE.length]]))
  }, [labs])
}
