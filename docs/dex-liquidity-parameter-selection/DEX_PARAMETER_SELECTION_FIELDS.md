# DEX Parameter Selection Fields

## Required fields

- selectionId
- dexVenue
- poolVersion
- tokenPair
- astraTokenAddress
- counterAssetSymbol
- counterAssetAddress
- feeTierOrPoolType
- initialPriceApproach
- initialPriceHuman
- liquidityAmountAstra
- liquidityAmountCounterAsset
- liquiditySource
- priceRange
- slippageGuidance
- impermanentLossDisclosure
- mevRiskDisclosure
- tokenImpersonationDisclosure
- safeTransactionPath
- publicTradingLinkPlan
- buyPageLanguage
- selectedAt

## Required safety values

- approvesPoolCreation must be false.
- approvesLiquidityProvision must be false.
- approvesPublicTrading must be false.
- generatesSafePayload must be false.
- movesFunds must be false.
- activatesBuyPage must be false.

## Rule

The parameter selection file must remain review-only.
