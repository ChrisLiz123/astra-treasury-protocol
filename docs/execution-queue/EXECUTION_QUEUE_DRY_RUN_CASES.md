# Execution Queue Dry Run Cases

## Case 1: Queue-disabled execution attempt

Expected result: blocked.

Reason: mainnetExecutionQueueEnabled is false.

## Case 2: Funding-dependent execution attempt

Expected result: blocked.

Reason: real treasury funding is not approved.

## Case 3: Paper-to-on-chain automation attempt

Expected result: blocked.

Reason: paper-to-on-chain automation is disabled.

## Case 4: Autonomous execution attempt

Expected result: blocked.

Reason: autonomous execution is disabled.

## Case 5: Manual execution without approvals

Expected result: blocked.

Reason: Governance Safe and Executor Safe review are required.

## Rule

Every case must remain blocked until a separate approval milestone changes the relevant capability.
