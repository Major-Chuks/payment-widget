import { IS_TESTNET, networks, SUPPORTED_CHAINS, TESTNET_FOR } from '@/config'
import type { AppKitNetwork } from '@reown/appkit/networks'

/**
 * The wallet network for a payment network slug from the API ("base",
 * "polygon", "ethereum", "solana", or one of their aliases). On sandbox the
 * mainnet slugs map to their test networks (base → Base Sepolia). Undefined
 * when the slug is unknown or not used on this environment.
 */
export function appKitNetworkForSlug(slug: string): AppKitNetwork | undefined {
    const lower = slug.toLowerCase()
    const entry = [...SUPPORTED_CHAINS.evm, ...SUPPORTED_CHAINS.solana].find(
        (chain) => chain.slug === lower || chain.aliases?.includes(lower),
    )
    if (!entry) return undefined
    const network = IS_TESTNET
        ? (TESTNET_FOR[String(entry.appKitNetwork.id)] ?? entry.appKitNetwork)
        : entry.appKitNetwork
    return networks.includes(network) ? network : undefined
}

/** On sandbox, the test network a payment network really uses ("Base Sepolia"). */
export function testnetName(slug: string): string | undefined {
    if (!IS_TESTNET) return undefined
    return appKitNetworkForSlug(slug)?.name
}

/**
 * The wallet network for a selected payment network: by its slug, falling
 * back to matching its name against this environment's networks.
 */
export function findAppKitNetwork({
    slug,
    name,
}: {
    slug?: string
    name: string
}): AppKitNetwork | undefined {
    const bySlug = slug ? appKitNetworkForSlug(slug) : undefined
    if (bySlug) return bySlug

    const lower = name.toLowerCase()
    return (
        networks.find(n => n.name.toLowerCase() === lower) ||
        networks.find(n => n.name.toLowerCase().includes(lower) || lower.includes(n.name.toLowerCase()))
    )
}
