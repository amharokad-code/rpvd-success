// Capture / choix d'une photo d'exercice + compression avant envoi (max 1600 px, JPEG 0.8) pour
// limiter le temps d'upload et rester sous la limite serveur de 8 Mo. L'image n'est jamais stockée
// côté serveur (contrat vie privée) : seule l'analyse l'est.
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

const MAX_SIDE = 1600
const JPEG_QUALITY = 0.8

export type PreparedImage = { base64: string; mimeType: 'image/jpeg'; uri: string }
export type PickResult =
  | { status: 'ok'; image: PreparedImage }
  | { status: 'cancelled' }
  | { status: 'denied' }

async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<PreparedImage> {
  const { width, height, uri } = asset
  const context = ImageManipulator.manipulate(uri)
  if (width >= height) {
    if (width > MAX_SIDE) context.resize({ width: MAX_SIDE })
  } else if (height > MAX_SIDE) {
    context.resize({ height: MAX_SIDE })
  }
  const ref = await context.renderAsync()
  const result = await ref.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true })
  if (!result.base64) throw new Error('Compression sans base64')
  return { base64: result.base64, mimeType: 'image/jpeg', uri: result.uri }
}

export async function pickImage(source: 'camera' | 'library'): Promise<PickResult> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return { status: 'denied' }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 }
  const picked =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
  if (picked.canceled || picked.assets.length === 0) return { status: 'cancelled' }
  return { status: 'ok', image: await prepare(picked.assets[0]) }
}
