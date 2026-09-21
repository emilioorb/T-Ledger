// La forma mínima que se usa de lo que entrega multer. Declararla acá evita sumar
// `@types/multer` por dos campos, y deja explícito qué se consume del archivo.
export interface UploadedFile {
  readonly originalname: string
  readonly buffer: Buffer
}
