const elliptic = require('elliptic')
const Multihash = require('multihashes')
const sha256 = require('js-sha256').sha256
const resolveDID = require('did-resolver').default

class Util {
  /**
   * Compute a multi-hash that is used in the did to root store process (fingerprinting)
   */
  static sha256Multihash (str) {
    const digest = Buffer.from(sha256.digest(str))
    return Multihash.encode(digest, 'sha2-256').toString('hex')
  }

  static uncompressSECP256K1Key (key) {
    const ec = new elliptic.ec('secp256k1') // eslint-disable-line new-cap
    return ec.keyFromPublic(key, 'hex').getPublic(false, 'hex')
  }

  static async didExtractSigningKey (did) {
    const doc = await Util.resolveDID(did)
    const signingKey = doc.publicKey.find(key => key.id.includes('#signingKey')).publicKeyHex
    return signingKey
  }

  static async resolveDID (did) {
    return resolveDID(did)
  }

  static async didToRootStoreAddress (did, { orbitdb }) {
    const signingKeyCompressed = await Util.didExtractSigningKey(did)

    const signingKey = Util.uncompressSECP256K1Key(signingKeyCompressed)
    const fingerprint = Util.sha256Multihash(did)

    const rootStore = `${fingerprint}.root`

    const opts = {
      format: 'dag-pb',
      accessController: {
        write: [signingKey],
        type: 'legacy-ipfs-3box',
        skipManifest: true
      }
    }
    const addr = await orbitdb.determineAddress(rootStore, 'feed', opts)

    return addr.toString()
  }
}

module.exports = Util
