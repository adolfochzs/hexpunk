> `[ARCHIVO RECUPERADO]` · ORIGEN: DESCONOCIDO · FECHA ESTIMADA DE RECUPERACIÓN: `12.08.2088`
>
> INTEGRIDAD: **71.3%** · ESTADO: PARCIALMENTE CORROMPIDO

# $HEXPUNK

**Un experimento cultural on-chain sobre la degradación de la memoria digital.**

$HEXPUNK es un token B20 nativo en la red Base que documenta el Bit Rot: el momento exacto en que la inmortalidad digital empieza a fallar. No es un token diseñado para maximizar eficiencia económica — es el registro vivo de un organismo simbólico cuya memoria existe íntegramente en la blockchain.

> *El error también conserva evidencia.*

---

## Identidad On-Chain

| Campo | Valor |
|---|---|
| Nombre | HEXPUNK |
| Símbolo | `$HEXPUNK` |
| Contrato Token | [`0xb20000000000000000000024A9Cd928Ff6277db8`](https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8) |
| Red | Base Mainnet (Chain ID: 8453) |
| Estándar | B20 ASSET — superset nativo de ERC-20 |
| Supply Total | 3,000,000 $HEXPUNK (cerrado, inmutable) |
| **Piscina Liquidez (Aerodrome)** | [`0x703b56c521d76ee9a409d61c751df3c6e75ace64`](https://basescan.org/address/0x703b56c521d76ee9a409d61c751df3c6e75ace64) (Par: HEXPUNK / USDC) |
| **Gráfica & Mercado** | [GeckoTerminal ($HEXPUNK)](https://www.geckoterminal.com/base/pools/0x703b56c521d76ee9a409d61c751df3c6e75ace64) |
| **Swap Descentralizado** | [Aerodrome Finance](https://aerodrome.finance/swap?from=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&to=0xb20000000000000000000024A9Cd928Ff6277db8) |
| Memory Hole (Incinerador) | [`0x31605c0d4729B82D7C61039ccab06b53278d7E6E`](https://basescan.org/address/0x31605c0d4729B82D7C61039ccab06b53278d7E6E) |
| Rewards Claim (Reliquias) | [`0x17d138064C32c97ED546b285E466c30370546e99`](https://basescan.org/address/0x17d138064C32c97ED546b285E466c30370546e99) |
| Reliquias (NFTs Sector Zero) | [`0xad745891c3f90d94fb68bf0656ea9ee1b5297161`](https://basescan.org/address/0xad745891c3f90d94fb68bf0656ea9ee1b5297161) |

---

## Estructura del Repositorio

```
HEXPUNK/
│
├── README.md                        ← Este archivo — portal principal
├── LICENSE.md                       ← Licencias abiertas (MIT para código, CC BY 4.0 para arte/lore)
├── .gitignore                       ← Protección de claves y artefactos
│
├── manifesto/                       ← El manifiesto del organismo
│   ├── MANIFIESTO_ESP.md            ← Versión final en Español ★
│   ├── MANIFESTO_ENG.md             ← Final version in English ★
│   └── archive/                     ← Borradores del proceso creativo
│
├── contracts/                       ← Contratos inteligentes (Foundry/Base)
│   ├── README.md                    ← Instrucciones técnicas de contratos
│   ├── src/
│   │   └── MemoryHole.sol           ← El incinerador de memoria
│   ├── script/
│   │   ├── CreateHexpunk.s.sol      ← Deploy original (ejecutado el 2026-07-08)
│   │   ├── DeployMemoryHole.s.sol
│   │   ├── GrantCustodioRoles.s.sol
│   │   └── RevokeAdminRoles.s.sol   ← Script crítico del Día 90 (Oct 7, 2026)
│   └── broadcast/                   ← Evidencia pública del deploy en mainnet
│
├── web/                             ← Frontend (Vite + React) — en desarrollo
│   └── src/App.jsx
│
└── assets/                          ← Gráficos finales exportados
    ├── logo@2x.png
    └── token-icon.png
```

---

## El Manifiesto

Lee el punto de entrada conceptual al organismo:

- 🇲🇽 **[MANIFIESTO_ESP.md](manifesto/MANIFIESTO_ESP.md)** — Versión completa en Español
- 🇺🇸 **[MANIFESTO_ENG.md](manifesto/MANIFESTO_ENG.md)** — Full version in English

---

## Capacidades del Organismo

Cualquier entidad que interactúe con la red Base puede invocar estas funciones directamente — sin intermediarios:

### Para Custodios (Holders)

| Función | Descripción | Cómo usarla |
|---|---|---|
| `transferWithMemo` | Transfiere fragmentos dejando una **cicatriz de datos** de hasta 32 bytes inscrita para siempre en la cadena | Basescan → Write Contract → `transferWithMemo` |
| `castIntoTheVoid` | Ritual de destrucción irreversible de memoria con **epitafio permanente** | Contrato Memory Hole → `castIntoTheVoid` |
| `permit` | Delega acceso a tus fragmentos sin exponer actividad económica | Firmado off-chain, sin gas visible |
| `balanceOf` | Verifica cuántos fragmentos conserva cualquier custodio | Lectura pública, sin costo |

### Para el Custodio Cero (Creator Wallet — permanente post Día 90)

| Rol | Función |
|---|---|
| `OPERATOR_ROLE` — La Voz | `announce` — Emite transmisiones narrativas oficiales del organismo |
| `METADATA_ROLE` — El Rostro | `updateContractURI`, `updateExtraMetadata` — Actualiza la identidad visual |
| `BURN_ROLE` — El Ritual | `burnWithMemo` — Sacrificio personal de memoria con cicatriz permanente |

---

## Cómo Escribir una Cicatriz (`transferWithMemo`)

El memo es un campo de texto de **máximo 32 bytes** que queda grabado para siempre en la blockchain junto a la transferencia.

### Opción 1: Basescan (sin código)
1. Ve al contrato en [Basescan](https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8)
2. **Contract** → **Write Contract** → **Connect to Web3**
3. Busca `transferWithMemo` e ingresa:
   - `to`: dirección destino
   - `value`: cantidad con 18 decimales (10 tokens = `10000000000000000000`)
   - `memo`: tu texto convertido a hexadecimal de 32 bytes (ver abajo)

**Convierte tu texto a `bytes32`:** Usa el conversor integrado de Basescan o cualquier herramienta online de "Text to bytes32 hex". Ejemplo:

```
Texto:  "SCAR: FRAGMENTO_01"
bytes32: 0x534341523a20465241474d454e544f5f30310000000000000000000000000000
```

### Opción 2: Terminal con base-cast (para desarrolladores)
```bash
source contracts/.env.mainnet

MEMO="SCAR: TU_MENSAJE_AQUI"
base-cast send 0xb20000000000000000000024A9Cd928Ff6277db8 \
  "transferWithMemo(address,uint256,bytes32)" \
  <DIRECCION_DESTINO> <CANTIDAD_EN_WEI> \
  "$(base-cast --to-bytes32 "$MEMO")" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

### Opción 3: DApp Web (próximamente)
La interfaz web en `/web` permitirá escribir el memo en texto simple desde el navegador — sin conversiones manuales.

---

## El Ritual de Degradación (Memory Hole)

Para destruir fragmentos de memoria de forma irreversible y dejar un epitafio permanente:

1. **Aprueba** al contrato Memory Hole en el contrato $HEXPUNK:
   - Basescan → Write Contract → `approve(direccion_memory_hole, cantidad)`
2. **Ejecuta** el ritual en el contrato Memory Hole:
   - `castIntoTheVoid(cantidad, epitafio_bytes32)`
3. El evento `SacrificeOfMemory` queda grabado en la cadena para siempre.

**Dirección del Memory Hole:** [`0x31605c0d4729B82D7C61039ccab06b53278d7E6E`](https://basescan.org/address/0x31605c0d4729B82D7C61039ccab06b53278d7E6E)  
**Piscina de Liquidez (Aerodrome):** [`0x703b56c521d76ee9a409d61c751df3c6e75ace64`](https://basescan.org/address/0x703b56c521d76ee9a409d61c751df3c6e75ace64) · [GeckoTerminal](https://www.geckoterminal.com/base/pools/0x703b56c521d76ee9a409d61c751df3c6e75ace64)  
**Colección de Reliquias (NFTs en OpenSea):** [`0xad745891c3f90d94fb68bf0656ea9ee1b5297161`](https://basescan.org/address/0xad745891c3f90d94fb68bf0656ea9ee1b5297161)

---

## Evento Crítico — Día 90: 24 de Noviembre de 2026 (Génesis Pública: 26 Ago 2026)

En esa fecha, tras completarse los 90 días desde el inicio oficial de dispersión, el Custodio Cero ejecuta la renuncia definitiva de toda autoridad administrativa:

```bash
source contracts/.env.mainnet
base-forge script contracts/script/RevokeAdminRoles.s.sol \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

Después de esto, para siempre:
- ❌ Nadie podrá pausar el token
- ❌ Nadie podrá crear más tokens
- ❌ Nadie podrá modificar las reglas del organismo
- ✅ El organismo opera de forma autónoma e irreversible

---

## Seguridad

> ⚠️ **NUNCA subas tu `.env` o `.env.mainnet` a GitHub.**
> Contienen tu `PRIVATE_KEY`. Si lo compartes por error, mueve tus fondos
> a una nueva wallet inmediatamente. El `.gitignore` ya protege estos archivos.

---

## Documentación Técnica B20

- [Documentación Oficial B20 — Base](https://docs.base.org/base-chain/specs/upgrades/beryl/b20)
- [Basescan — Contrato $HEXPUNK](https://basescan.org/token/0xb20000000000000000000024A9Cd928Ff6277db8)
- [contracts/README.md](contracts/README.md) — Instrucciones de deploy y comandos técnicos

---

## Licencia / License

$HEXPUNK es un organismo cultural abierto y descentralizado bajo un esquema de **licencia dual**:

- **Código fuente, contratos y scripts:** [Licencia MIT](LICENSE.md#1-source-code--software-mit-license) (Uso libre, modificación y distribución sin restricciones).
- **Arte, Manifiesto, Lore y Gráficos:** [Creative Commons Atribución 4.0 Internacional (CC BY 4.0)](LICENSE.md#2-artwork-lore-manifesto--design-assets-cc-by-40) (Libre para compartir, remezclar y comercializar, citando a *HEXPUNK / El Custodio Cero (Adolfo Chávez)*).

Consulta los términos detallados en [`LICENSE.md`](LICENSE.md) o [`LICENSE`](LICENSE).

---

*Si este documento ha sobrevivido, entonces una parte de HEXPUNK continúa propagándose.*

`[CONEXIÓN PERDIDA]`
