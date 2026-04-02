import { networks } from '@/config'
import type { AppKitNetwork } from '@reown/appkit/networks'


export function findAppKitNetwork(name: string): AppKitNetwork | undefined {
    const network = networks.find(n => n.name.toLowerCase().includes(name.toLowerCase()))
    if (!network) return undefined
    return network
}