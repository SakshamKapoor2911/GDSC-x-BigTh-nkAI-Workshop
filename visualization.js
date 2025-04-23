// Initialize D3 visualization
const width = 850;  // Restored original width
const height = 650;
const nodeRadius = 38;

const svg = d3.select('#flow-visualization')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

// Add arrow marker definitions with distinct styles
svg.append('defs').selectAll('marker')
    .data(['standard', 'conditional'])
    .enter().append('marker')
    .attr('id', d => `arrowhead-${d}`)
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', nodeRadius + 10)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 7)
    .attr('markerHeight', 7)
    .append('path')
    .attr('d', 'M0,-4L6,0L0,4')
    .attr('fill', d => d === 'conditional' ? '#94e2d5' : '#89b4fa');

// Create force simulation with better organization
const simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(200))
    .force('charge', d3.forceManyBody().strength(-1000))
    .force('collide', d3.forceCollide().radius(nodeRadius * 2))
    .alphaDecay(1e-5) // Slow decay for smoother animation
    .velocityDecay(0.90) // Slightly slower decay for more stable positions
    .force('x', d3.forceX(d => {
        if (d.id === 'END') return width * 0.5;
        switch(d.id) {
            case 'START': return width * 0.3;
            case 'interactive_conversation': return width * 0.3;
            case 'determine_research_needs': return width * 0.7;
            case 'generate_analysis': return width * 0.7;
            case 'final_response': return width * 0.7;
            case 'reset_conversation': return width * 0.3;
            default: return width * 0.5;
        }
    }).strength(0.2))
    .force('y', d3.forceY(d => {
        if (d.id === 'END') return height * 0.5;
        switch(d.id) {
            case 'START': return height * 0.2;
            case 'interactive_conversation': return height * 0.4;
            case 'determine_research_needs': return height * 0.4;
            case 'generate_analysis': return height * 0.6;
            case 'final_response': return height * 0.8;
            case 'reset_conversation': return height * 0.6;
            default: return height * 0.5;
        }
    }).strength(0.2));

// Load and process data
function visualizeFlow(data) {
    // Ensure unique nodes by ID before adding to simulation
    const uniqueNodes = Array.from(new Map(data.nodes.map(node => [node.id, node])).values());
    const nodes = uniqueNodes.map(node => ({...node}));
    const links = data.links.map(link => ({...link}));

    // Update link elements to use appropriate arrow markers and classes
    const link = svg.append('g')
        .selectAll('path')
        .data(links)
        .enter().append('path')
        .attr('class', d => {
            // Add conditional class only if there's a condition and it's not a standard transition
            return `flow-path${(d.condition && !['Initialize conversation', 'Research complete', 'Analysis generated'].includes(d.condition)) ? ' conditional' : ''}`;
        })
        .attr('marker-end', d => (d.condition && !['Initialize conversation', 'Research complete', 'Analysis generated'].includes(d.condition)) ? 'url(#arrowhead-conditional)' : 'url(#arrowhead-standard)');

    // Add condition labels
    const linkLabels = svg.append('g')
        .selectAll('text')
        .data(links.filter(l => l.condition))
        .enter().append('text')
        .attr('class', 'condition-label')
        .text(d => d.condition);

    // Create node elements
    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('class', d => {
            if (d.id === 'START') return 'state-node start-state';
            if (d.id === 'END') return 'state-node end-state';
            return 'state-node';
        })
        .attr('r', nodeRadius)
        .on('mouseover', handleNodeHover)
        .on('mouseout', handleNodeUnhover)
        .on('click', handleNodeClick);

    // Add node labels
    const labels = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .attr('class', d => {
            if (d.id === 'START') return 'state-label start-state';
            if (d.id === 'END') return 'state-label end-state';
            return 'state-label';
        })
        .attr('dy', '.35em')
        .text(d => d.label || d.id);

    // Initialize tooltip
    const tooltip = d3.select('.tooltip');

    // Handle node hover
    function handleNodeHover(event, d) {
        const node = d3.select(this);
        node.classed('active', true);
        
        tooltip.style('display', 'block')
            .html(`
                <strong>${d.label}</strong><br>
                ${d.description || ''}<br>
                ${d.conditions ? '<br>Conditions:<br>' + d.conditions.join('<br>') : ''}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }

    // Handle node unhover
    function handleNodeUnhover() {
        d3.select(this).classed('active', false);
        tooltip.style('display', 'none');
    }

    // Handle node click
    function handleNodeClick(event, d) {
        updateStateDetails(d);
        highlightRelatedPaths(d);
    }

    // Update state details panel
    function updateStateDetails(node) {
        const stateDetails = d3.select('#state-details');
        const transitions = links.filter(l => l.source.id === node.id || l.target.id === node.id);
        
        // Header with state name and activation details
        stateDetails.html(`
            <div class="state-header">${node.label}</div>
            <div class="state-section">
                <div class="section-title">Description</div>
                <div class="section-content">${node.details.description || node.description}</div>
            </div>
            
            <div class="state-section">
                <div class="section-title">Activation</div>
                <div class="section-content">${node.details.activation || 'Standard activation'}</div>
            </div>

            <div class="state-section">
                <div class="section-title">Conditions</div>
                <div class="section-content">
                    ${(node.details.conditions || []).map(c => 
                        `<div class="condition-tag">${c}</div>`
                    ).join('')}
                </div>
            </div>

            <div class="state-section">
                <div class="section-title">Tools Used</div>
                <div class="tech-tags">
                    ${(node.details.tools || []).map(tool => 
                        `<span class="tech-tag">${tool}</span>`
                    ).join('')}
                </div>
            </div>

            <div class="state-section">
                <div class="section-title">Transitions</div>
                <div class="section-content">
                    ${Object.entries(node.details.transitions || {}).map(([target, condition]) => `
                        <div class="transition-item">
                            <strong>${target}</strong>
                            <div class="condition-tag">${condition}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `);
    }

    function getActivationDetails(stateId) {
        const stateInfo = {
            'start': 'Activated when the conversation begins',
            'interactive_conversation': 'Activated by determine_next_stage function when user input is received',
            'determine_research_needs': 'Activated when sufficient symptom information is gathered',
            'generate_analysis': 'Activated after research phase completes',
            'final_response': 'Activated after analysis is complete',
            'reset_conversation': 'Activated when user requests a new topic',
            'END': 'Activated when user types exit or conversation concludes'
        };
        return stateInfo[stateId] || 'Activation details not available';
    }

    function getTechTags(stateId) {
        const techStack = {
            'interactive_conversation': ['LangChain', 'Gemini Pro', 'JSON Parser', 'Rate Limiter'],
            'determine_research_needs': ['Perplexity API', 'sonar-pro', 'Rate Limiter', 'HTTP Requests'],
            'generate_analysis': ['LangChain', 'Gemini Pro', 'Markdown', 'State Manager'],
            'final_response': ['Markdown', 'State Manager'],
            'reset_conversation': ['State Manager'],
            'END': ['State Manager']
        };
        return (techStack[stateId] || []).map(tech => `<span class="tech-tag">${tech}</span>`).join('');
    }

    function getStateConditions(stateId) {
        const conditions = {
            'interactive_conversation': `
                <strong>Next State Conditions:</strong><br>
                1. If sufficient information gathered (determined by LLM):
                   <div class="condition-tag">→ determine_research_needs</div>
                2. If more information needed:
                   <div class="condition-tag">→ wait for user input</div>
                Max questions limit: 10 (failsafe)
            `,
            'determine_research_needs': `
                <strong>Processing Conditions:</strong><br>
                - Uses structured symptom data if available
                - Falls back to raw conversation if extraction failed
                - Rate limited API calls (1 second delay)
            `,
            'generate_analysis': `
                <strong>Analysis Requirements:</strong><br>
                - Valid research results present
                - Structured symptom data
                - Confidence scores for conditions
            `,
            'final_response': `
                <strong>Report Generation Rules:</strong><br>
                1. If user asks about new topic:
                   <div class="condition-tag">→ reset_conversation</div>
                2. If conversation complete:
                   <div class="condition-tag">→ END</div>
            `,
            'reset_conversation': `
                <strong>Reset Conditions:</strong><br>
                - Preserves last user message
                - Resets all state variables
                - Returns to conversation stage
            `
        };
        return conditions[stateId] || 'No specific conditions';
    }

    function getTransitionDetails(from, to) {
        const transitions = {
            'start_interactive_conversation': 'Initializes conversation with empty state and system prompt',
            'interactive_conversation_determine_research_needs': 'Triggered when LLM determines sufficient symptom information is gathered',
            'determine_research_needs_generate_analysis': 'Passes research results to analysis phase for processing',
            'generate_analysis_final_response': 'Formats analyzed data into structured medical report with disclaimers',
            'final_response_reset_conversation': 'Clears state while preserving last message for new topic',
            'reset_conversation_interactive_conversation': 'Begins new conversation cycle with preserved context'
        };
        return transitions[`${from}_${to}`] || 'Standard state transition';
    }

    // Highlight related paths
    function highlightRelatedPaths(node) {
        const relatedLinks = links.filter(l => 
            l.source.id === node.id || l.target.id === node.id
        );

        // Remove all active classes first
        link.classed('active', false)
            .classed('highlighted', false);
            
        // Add active class to related paths
        link.filter(l => relatedLinks.includes(l))
            .classed('active', true)
            .classed('highlighted', true);

        // Bring highlighted paths to front
        link.filter(l => relatedLinks.includes(l)).each(function() {
            this.parentNode.appendChild(this);
        });
    }

    // Add curved paths for better visibility
    function getLinkPath(d) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Self-referential paths (loops) - make larger and position to left
        if (d.source.id === d.target.id) {
            const loopRadius = nodeRadius * 4; // Increased size further
            return `M${d.source.x},${d.source.y}
                    C${d.source.x - loopRadius * 1.5},${d.source.y} 
                    ${d.source.x - loopRadius * 1.5},${d.source.y - loopRadius}
                    ${d.source.x},${d.source.y}`; // Loop comes from left side
        }
        
        // Paths connected to START or END
        if (d.source.id === 'START' || d.target.id === 'END') {
            const midX = (d.source.x + d.target.x) / 2;
            const midY = (d.source.y + d.target.y) / 2;
            const curvature = 0.2;
            
            // Adjust control points based on vertical distance
            const controlY = midY - Math.abs(dy) * curvature;
            
            return `M${d.source.x},${d.source.y}
                    Q${midX},${controlY}
                    ${d.target.x},${d.target.y}`;
        }
        
        // Standard paths with smoother curves
        const curvature = 0.3;
        const midX = (d.source.x + d.target.x) / 2;
        const midY = (d.source.y + d.target.y) / 2;
        const offX = midX + (dy * curvature);
        const offY = midY - (dx * curvature);
        
        return `M${d.source.x},${d.source.y}
                Q${offX},${offY}
                ${d.target.x},${d.target.y}`;
    }

    // Update force simulation
    simulation.nodes(nodes)
        .on('tick', () => {
            // Keep nodes at their assigned positions
            nodes.forEach(node => {
                if (node.id === 'END') {
                    node.x = width * 0.5;
                    node.y = height * 0.5;
                }
            });

            link.attr('d', getLinkPath);
            node.attr('cx', d => d.x)
                .attr('cy', d => d.y);
            labels.attr('x', d => d.x)
                .attr('y', d => d.y);
            linkLabels.attr('x', d => (d.source.x + d.target.x) / 2)
                     .attr('y', d => (d.source.y + d.target.y) / 2 - 10);
        });

    simulation.force('link').links(links);
}

// Load initial data
fetch('nodeData.json')
    .then(response => response.json())
    .then(data => visualizeFlow(data))
    .catch(error => console.error('Error loading data:', error));