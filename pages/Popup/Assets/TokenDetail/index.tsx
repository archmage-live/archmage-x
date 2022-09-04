import { useToken } from '~lib/services/token'

interface TokenDetailProps {
  id: number
}

export default function TokenDetail({ id }: TokenDetailProps) {
  const token = useToken(id)

  return <></>
}
