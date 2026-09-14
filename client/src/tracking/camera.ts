export type CameraFacing = 'user' | 'environment';

export interface CameraOptions {
  deviceId?: string;
  facing: CameraFacing;
  width: number;
  height: number;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export async function listCameraDevices(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === 'videoinput')
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
    }));
}

export async function startCamera(
  video: HTMLVideoElement,
  options: CameraOptions,
): Promise<MediaStream> {
  stopCamera(video);
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: options.deviceId
      ? {
          deviceId: { exact: options.deviceId },
          width: { ideal: options.width },
          height: { ideal: options.height },
        }
      : {
          facingMode: options.facing,
          width: { ideal: options.width },
          height: { ideal: options.height },
        },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;
  await video.play();
  return stream;
}

export function stopCamera(video: HTMLVideoElement): void {
  const stream = video.srcObject;
  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }
  video.srcObject = null;
}
