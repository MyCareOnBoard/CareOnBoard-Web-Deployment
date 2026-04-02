# Transcription Services

This directory contains transcription service implementations. The architecture is designed to make it easy to swap between different transcription providers.

## Current Implementation

Currently using **ElevenLabs Scribe v2** for real-time speech-to-text transcription.

## Architecture

### Service Interface

All transcription services should implement the following interface:

```typescript
interface TranscriptionServiceProps {
  isRecording: boolean;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  onLanguageDetected: (languageCode: string) => void;
  onError: (error: string) => void;
  onConnecting: (isConnecting: boolean) => void;
  onSpeechDetected: (isSpeaking: boolean) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onStopRecording: () => void;
}
```

### Callbacks

- **`onPartialTranscript`**: Called in real-time as speech is being transcribed (interim results)
- **`onCommittedTranscript`**: Called when a transcript segment is finalized
- **`onLanguageDetected`**: Called when the language is detected (e.g., "en", "es")
- **`onError`**: Called when an error occurs
- **`onConnecting`**: Called to indicate connection state (loading)
- **`onSpeechDetected`**: Called when speech activity is detected (for animations)
- **`onConnectionChange`**: Called when connection status changes
- **`onStopRecording`**: Called to stop the recording (usually on error)

## Swapping Transcription Services

To use a different transcription service:

### 1. Create a New Service Component

Create a new file like `GoogleTranscription.tsx`, `AssemblyAITranscription.tsx`, etc.

```typescript
// src/components/transcription/GoogleTranscription.tsx

import { useEffect } from "react";
// Import your service SDK

interface GoogleTranscriptionProps {
  isRecording: boolean;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  onLanguageDetected: (languageCode: string) => void;
  onError: (error: string) => void;
  onConnecting: (isConnecting: boolean) => void;
  onSpeechDetected: (isSpeaking: boolean) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onStopRecording: () => void;
}

export default function GoogleTranscription({
  isRecording,
  onPartialTranscript,
  onCommittedTranscript,
  // ... other props
}: GoogleTranscriptionProps) {
  // Implement your service logic here
  
  useEffect(() => {
    if (isRecording) {
      // Connect to your service
      // Set up callbacks
      // Start transcription
    }
    
    return () => {
      // Cleanup: disconnect, stop recording
    };
  }, [isRecording]);

  return null; // This component doesn't render anything
}
```

### 2. Update VoiceInputButton

Replace the import in `VoiceInputButton.tsx`:

```typescript
// Change from:
import ElevenLabsTranscription from "@/components/transcription/ElevenLabsTranscription";

// To:
import GoogleTranscription from "@/components/transcription/GoogleTranscription";
```

Then update the component usage:

```typescript
// Change from:
<ElevenLabsTranscription
  isRecording={isRecording}
  onPartialTranscript={setPartialTranscript}
  // ... other props
/>

// To:
<GoogleTranscription
  isRecording={isRecording}
  onPartialTranscript={setPartialTranscript}
  // ... other props
/>
```

### 3. That's It!

The UI and all other logic remains the same. Only the transcription service changes.

## Example Services to Try

- **Google Speech-to-Text**: Real-time streaming transcription
- **AssemblyAI**: High-accuracy transcription with speaker diarization
- **Azure Speech Services**: Microsoft's speech recognition
- **AWS Transcribe**: Amazon's transcription service
- **Deepgram**: Fast, accurate speech recognition
- **OpenAI Whisper**: Open-source alternative (may need backend)

## Testing

To test a new service:

1. Create the new service component
2. Update the import in `VoiceInputButton.tsx`
3. Test the following scenarios:
   - Start recording
   - Speech detection and animations
   - Partial transcripts appearing in real-time
   - Committed transcripts after silence
   - Language detection
   - Error handling
   - Stop/Cancel functionality
   - Accept functionality

## Current Service: ElevenLabs

**File**: `ElevenLabsTranscription.tsx`

**Features**:
- Real-time transcription with ultra-low latency
- Voice Activity Detection (VAD)
- Automatic language detection
- Speech activity detection for animations
- Token-based authentication

**Configuration**:
- VAD Threshold: 0.5
- Silence Threshold: 1.0 seconds
- Commit Strategy: VAD (auto-commits on silence)

## Benefits of This Architecture

✅ **Easy to swap**: Change one import, everything else stays the same  
✅ **Testable**: Try different services without changing UI code  
✅ **Maintainable**: Service logic is isolated from UI logic  
✅ **Flexible**: Each service can have its own configuration  
✅ **Clean**: UI components don't know about service implementation details  

## Future Improvements

- Create a factory pattern for dynamic service selection
- Add service configuration UI
- Support multiple services running simultaneously
- Add service comparison metrics
- Implement fallback services for reliability

