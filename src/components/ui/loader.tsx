/**
 * Loader Component
 * 
 * Reusable loading spinner component with different sizes and variants
 */

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  secondaryColor?: string
  fullScreen?: boolean
  text?: string
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 60,
  xl: 80,
}

export function Loader({
  size = 'md',
  color = '#00B4B8',
  secondaryColor = '#148a9c',
  fullScreen = false,
  text,
}: LoaderProps) {
  const loaderSize = sizeMap[size]

  const loader = (
    <div className="flex flex-col items-center justify-center gap-3">
      <span
        aria-label="loading"
        className="animate-spin rounded-full border-4 border-solid"
        role="status"
        style={{
          borderColor: secondaryColor,
          borderTopColor: color,
          height: loaderSize,
          width: loaderSize,
        }}
      />
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {loader}
      </div>
    )
  }

  return loader
}

/**
 * Page Loader - For full page loading states
 */
export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return <Loader size="lg" fullScreen text={text} />
}

/**
 * Inline Loader - For inline loading states
 */
export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader size="md" text={text} />
    </div>
  )
}

/**
 * Button Loader - For button loading states
 */
export function ButtonLoader() {
  return <Loader size="sm" color="white" secondaryColor="rgba(255,255,255,0.6)" />
}
