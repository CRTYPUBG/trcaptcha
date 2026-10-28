"use client"

/**
 * `border-beam` paketi için istemci sınırı sarmalayıcısı.
 *
 * Paketin kendi kaynağında `"use client"` direktifi YOKTUR ve içinde `useState`
 * gibi istemci kancaları vardır. Bu yüzden doğrudan bir Server Component'tan
 * kullanıldığında şu hatayı verir:
 *
 *   Error: useState only works in Client Components.
 *   Add the "use client" directive at the top of the file...
 *
 * Bu dosya o sınırı oluşturur; böylece `BorderBeam` hem sunucu hem istemci
 * bileşenlerinden güvenle import edilebilir. Projedeki TÜM `BorderBeam`
 * kullanımları bu yoldan gelmeli.
 */
export { BorderBeam } from "border-beam"
export type {
  BorderBeamColorVariant,
  BorderBeamProps,
  BorderBeamSize,
} from "border-beam"
