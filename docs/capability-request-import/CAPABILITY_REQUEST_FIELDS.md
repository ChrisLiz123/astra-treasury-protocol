# Capability Request Fields

## Required fields

- requestId
- requestedCapability
- requesterReference
- authorityReference
- purpose
- scope
- evidenceReference
- publicStatusPlan
- onchainImpact
- safeTransactionImpact
- safePayloadGenerationRequested
- executionQueueActivationRequested
- fundsMovementRequested
- requestedAt

## Required values for intake safety

- safePayloadGenerationRequested must be false.
- executionQueueActivationRequested must be false.
- fundsMovementRequested must be false.

## Allowed capabilities

- fullLaunch
- publicTokenSale
- realTreasuryFunding
- stakingOrRewards
- buybackProgram
- mainnetExecutionQueue
- paperToOnchainAutomation
- autonomousExecution
- safeTransactionPayloadGeneration
- safeTransactionExecution

## Rule

A capability request is not approval.
