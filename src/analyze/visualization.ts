import fs from 'fs';
import chalk from 'chalk';
import { Graph, AnalyzeOptions } from './types';
import { exportD3Format } from './exporters';
import { AnalyzerConfig } from './analyzer-config';

export async function generateHtmlVisualization(graph: Graph, config: AnalyzerConfig) {
  const d3Data = exportD3Format(graph);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Dependency Graph Visualization</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; }
    #graph { width: 100vw; height: 100vh; }
    .node { cursor: pointer; }
    .link { stroke-opacity: 0.6; }
    .node text { font-size: 10px; }
    .tooltip {
      position: absolute;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      pointer-events: none;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="graph"></div>
  <script>
    const data = ${d3Data};
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Create a tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
    
    // Create the simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
    
    // Create the SVG container
    const svg = d3.select("#graph")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Add zoom behavior
    svg.call(d3.zoom()
      .extent([[0, 0], [width, height]])
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      }));
    
    const container = svg.append("g");
    
    // Create the links
    const link = container.append("g")
      .selectAll("line")
      .data(data.links)
      .enter().append("line")
      .attr("stroke", d => d.type === "import" ? "#999" : "#66f")
      .attr("stroke-width", d => d.value)
      .attr("stroke-dasharray", d => d.type === "call" ? "5,5" : "")
      .attr("class", "link");
    
    // Create the nodes
    const node = container.append("g")
      .selectAll(".node")
      .data(data.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
    
    // Add circles to nodes
    node.append("circle")
      .attr("r", 8)
      .attr("fill", d => d.group === 1 ? "#f66" : "#6cf");
    
    // Add labels to nodes
    node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(d => d.label);
    
    // Add tooltips
    node.on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(d.id)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
    
    // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      
      node
        .attr("transform", d => \`translate(\${d.x},\${d.y})\`);
    });
    
    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  </script>
</body>
</html>
  `;

  fs.writeFileSync(config.outputPath, html);
  console.log(chalk.blue(`HTML visualization written to ${config.outputPath}`));

  // Open in browser if requested
  if (config.shouldOpen) {
    return import('open').then((A) => {
      console.log(chalk.green(`Opening ${config.outputPath} in your browser`));
      return A.default(config.outputPath);
    });
  }
}
