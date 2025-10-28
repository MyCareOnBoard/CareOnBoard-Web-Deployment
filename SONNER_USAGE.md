# Sonner Toast Notifications

Sonner has been integrated into your app for beautiful toast notifications.

## Usage

### Using the useToast hook (compatible with existing code)

```tsx
import { useToast } from '@/hooks/use-toast'

function MyComponent() {
  const { toast } = useToast()

  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Your action was completed successfully",
    })
  }

  const handleError = () => {
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "destructive",
    })
  }

  return (
    <button onClick={handleSuccess}>Show Success</button>
  )
}
```

### Using Sonner directly (more features)

```tsx
import { toast } from 'sonner'

function MyComponent() {
  // Success toast
  const showSuccess = () => {
    toast.success('Event created', {
      description: 'Your event has been created successfully',
    })
  }

  // Error toast
  const showError = () => {
    toast.error('Failed to create event', {
      description: 'Please try again later',
    })
  }

  // Info toast
  const showInfo = () => {
    toast.info('Update available', {
      description: 'A new version is ready',
    })
  }

  // Warning toast
  const showWarning = () => {
    toast.warning('Low storage', {
      description: 'You are running out of space',
    })
  }

  // Loading toast
  const showLoading = () => {
    const id = toast.loading('Loading...')
    
    // Later, update it
    setTimeout(() => {
      toast.success('Done!', { id })
    }, 2000)
  }

  // Promise toast
  const showPromise = async () => {
    toast.promise(
      fetch('/api/data').then(res => res.json()),
      {
        loading: 'Loading data...',
        success: 'Data loaded successfully',
        error: 'Failed to load data',
      }
    )
  }

  // Custom action
  const showWithAction = () => {
    toast.success('Event created', {
      action: {
        label: 'Undo',
        onClick: () => console.log('Undo clicked'),
      },
    })
  }

  return (
    <div>
      <button onClick={showSuccess}>Success</button>
      <button onClick={showError}>Error</button>
      <button onClick={showInfo}>Info</button>
      <button onClick={showWarning}>Warning</button>
      <button onClick={showLoading}>Loading</button>
      <button onClick={showPromise}>Promise</button>
      <button onClick={showWithAction}>With Action</button>
    </div>
  )
}
```

## Configuration

The Toaster is already configured in `src/main.tsx` with:
- Position: top-right
- Rich colors enabled (better looking toasts)

You can customize it by modifying the Toaster component:

```tsx
<Toaster 
  position="top-right" 
  richColors 
  expand={true}
  duration={4000}
/>
```

## Available Options

- `position`: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
- `richColors`: Enable colored toasts based on type
- `expand`: Expand toasts by default
- `duration`: Duration in milliseconds (default: 4000)
- `closeButton`: Show close button on toasts

## Learn More

- [Sonner Documentation](https://sonner.emilkowal.ski/)
- [Sonner GitHub](https://github.com/emilkowalski/sonner)
