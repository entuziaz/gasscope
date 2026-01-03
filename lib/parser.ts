// 1. implement algorithm
// input: structLogs[]
// output: CallFrame tree

// Step 1: initalize state before reading logs:
//  1. create an empty stack: callStack
//  2. create a root frame:
//      depth = 0
//      gasUsed = 0
//  3. push root frame onto stack

// Step 2: Iterate through structLogs IN ORDER. For each opcode log:
//  2.1. Handle depth changes: compare currentLog.depth and topOfStack.depth
//      Case A: Same depth:
            // - Still in same call frame
            // - Continue
//      Case B: Depth increased
            // - A `CALL`-like opcode just happened
            // - A new call frame begins
            // Action:
            //  - Create new CallFrame
            //  - Set its depth
            //  - Push it onto `callStack`
            //  - Attach it as child of previous frame
//      Case C: Depth decreased: One or more calls returned: this alone builds the call tree 
            //  - Pop frames until depths match
            //  - Continue execution in parent frame

//  2.2. Sttribute gas: for the currrent frame (top of stack):
        // fame.gasUsed += log.gasCost

//  2.3. Record opcode info (optionl)

// Step 3: End result: after processing all logs, you have:
    // A call tree with:
        // exact gas per frame
        // nested children
        // opcode-level detail

