import { redirect } from 'next/navigation'

export default function RoommatesPage() {
  redirect('/discover?tab=people')
}
