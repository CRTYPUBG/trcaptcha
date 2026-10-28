import data from "@/data/turkiye-places.json"

export type Place = {
  id: string
  name: string
  city: string
  region: string
  imageUrl: string
  source: string
  license: string
  author?: string
  isTurkish: boolean
  tags: string[]
  difficulty: number
}

const all = (data as { places: Place[] }).places
const byId = new Map(all.map((p) => [p.id, p]))

export const getAllPlaces = () => all
export const getPlaceById = (id: string) => byId.get(id)
