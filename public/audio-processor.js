class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferQueue = [];
    this.bufferSize = 0;
    this.targetSize = 1600; 
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input.length > 0) {
      const inputData = input[0];
      
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.bufferQueue.push(int16Data);
      this.bufferSize += int16Data.length;

      if (this.bufferSize >= this.targetSize) {
        const mergedBuffer = new Int16Array(this.bufferSize);
        let offset = 0;
        for (const buffer of this.bufferQueue) {
          mergedBuffer.set(buffer, offset);
          offset += buffer.length;
        }

        this.port.postMessage({ audio_data: mergedBuffer.buffer }, [mergedBuffer.buffer]);

        this.bufferQueue = [];
        this.bufferSize = 0;
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);