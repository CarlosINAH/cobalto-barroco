declare module "utif" {
  /** Un IFD (directorio de imagen) decodificado por UTIF. */
  interface UtifIFD {
    width: number;
    height: number;
    [key: string]: unknown;
  }

  const UTIF: {
    /** Decodifica el contenedor TIFF y devuelve sus IFDs (sin píxeles aún). */
    decode(buffer: ArrayBuffer | Uint8Array): UtifIFD[];
    /** Decodifica los píxeles de un IFD concreto. */
    decodeImage(buffer: ArrayBuffer | Uint8Array, ifd: UtifIFD): void;
    /** Convierte un IFD ya decodificado a un arreglo RGBA de 8 bits. */
    toRGBA8(ifd: UtifIFD): Uint8Array;
  };

  export default UTIF;
}
