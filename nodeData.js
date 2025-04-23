const nodeData = {
    'START': {
        description: 'Initial state of the conversation',
        transitions: [
            {
                to: 'Conversation',
                condition: 'User initiates conversation',
                notes: 'Can oscillate between START and Conversation if initial context is unclear'
            }
        ]
    },
    'Conversation': {
        description: 'Active dialogue state with the user',
        transitions: [
            {
                to: 'Research',
                condition: 'Sufficient information gathered'
            },
            {
                to: 'START',
                condition: 'Need more initial context',
                notes: 'May loop back to gather essential information'
            }
        ]
    },
    'Research': {
        description: 'Information gathering and context analysis state',
        transitions: [
            {
                to: 'Analysis',
                condition: 'Research phase complete'
            },
            {
                to: 'Conversation',
                condition: 'Need additional clarification',
                notes: 'Multiple paths possible based on research findings'
            }
        ]
    },
    'Analysis': {
        description: 'Processing and evaluating gathered information',
        transitions: [
            {
                to: 'Report',
                condition: 'Analysis complete'
            },
            {
                to: 'Research',
                condition: 'Need additional research',
                notes: 'Multiple analysis paths possible based on complexity'
            }
        ]
    },
    'Report': {
        description: 'Presenting findings and recommendations',
        transitions: [
            {
                to: 'Conversation',
                condition: 'New topic or follow-up questions',
                notes: 'Can lead to multiple new conversation threads'
            }
        ]
    }
};