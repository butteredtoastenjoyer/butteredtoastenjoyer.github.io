const width = 1500;
const height = 1000;
let eraStep = 0
let colorMode = 'genre'

const svg = d3.select("#graph")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .style("background", "#f6f7ffff");

const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip");

const genres = [
  "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
  "Comedy", "Drama", "Fantasy", "Girls Love", "Gourmet", "Horror",
  "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
  "Supernatural", "Suspense"
];

const customColors = [
  "#1f77b4", 
  "#ff7f0e", 
  "#2ca02c", 
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f", 
  "#bcbd22", 
  "#17becf",
  "#393b79",
  "#637939", 
  "#8c6d31",
  "#843c39", 
  "#7b4173", 
  "#3182bd", 
  "#e6550d",
  "#31a354"  // full disclosure I'm colorblind and asked GPT for 18 distinct colors
];

const colorScale = d3.scaleOrdinal()
  .domain(genres)
  .range(customColors);


const simulation = d3.forceSimulation()
    .force("x", d3.forceX(width / 2).strength(0.2))
    .force("y", d3.forceY(height / 2).strength(0.2))
    // gravity forces
    .force("charge", d3.forceManyBody().strength(-10))
    // electrostatic repulsion
    .force("collision", d3.forceCollide().radius(d => Math.sqrt(d.members) / 100 + 2))
    // anti-overlap based on radius
    .on("tick", ticked);
    // start

setTimeout(() => simulation.stop(), 3000); 

let nodes;

function ticked() {
  if (!nodes) return;
  nodes
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);
}

const legend = svg.append("g")
  .attr("transform", `translate(${width - 180}, 20)`); //top-right placement

const legendItemSize = 16;
const legendSpacing = 5;

genres.forEach((genre, i) => {
  const row = legend.append("g")
    .attr("transform", `translate(0, ${i * (legendItemSize + legendSpacing)})`);
     // the $ is kind of like an f-string in python
  row.append("rect")
    .attr("width", legendItemSize)
    .attr("height", legendItemSize)
    .attr("fill", colorScale(genre));

  row.append("text")
    .attr("x", legendItemSize + 6)
    .attr("y", legendItemSize / 2)
    .attr("dy", "9")
    .text(genre)
});

let nodesData = [];

function addData(newData) {
    // necessary to stop it from killing your machine if you keep pressing the buttons
    const existingTitles = new Set(nodesData.map(d => d.title));
    const filteredNewData = newData.filter(d => !existingTitles.has(d.title));
    filteredNewData.forEach(d => {
        d.primaryGenre = d.genres.split(",")[0].trim();  // Just using the first alphabetical genre as primary
    });

    nodesData = nodesData.concat(filteredNewData);

    nodes = svg.selectAll("circle")
        .data(nodesData, d => d.title);
    // kind of like a dictionary. basically the "key value" is the title
    // => just means return

    // new circles
    nodes.enter()
        .append("circle")
        .attr("r", d => Math.sqrt(d.members) / 100)
        .attr("fill", d => colorScale(d.primaryGenre))
        .on("mouseover", (event, d) => {
        tooltip
            .style("opacity", 1)
            .html(`${d.title}
                <br>Rating: ${d.score}
                <br>Views: ${d.members}
                <br>Genre: ${d.primaryGenre}
                <br>Year: ${d.year}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0); //mouseOut disappear
        });

    nodes.exit().remove();

    nodes = svg.selectAll("circle");

    simulation.nodes(nodesData).alpha(1).restart();
    setTimeout(() => simulation.stop(), 6000);
}

// data loading at the end, starts by adding the old data

d3.csv("anime - anime.csv").then(data => {
  // data filtering and removing 
  console.log([...new Set(data.map(d => d.type))]);
  const cleaned = data.filter(d =>
    d.year !== "" &&
    d.score !== "" &&
    d.members !== "" &&
    d.genres !== "" &&
    d.type !== "" &&
    +d.members > 10000);
  // why does this filter make all the types = TV!?
  // ok we're taking out the filters for the type because this straight up doesn't work and im tired
  // i found out that "year" only applies to data with tv airing for some reason
  // the whole project kind of hinges on it so. Idk 
  console.log([...new Set(cleaned.map(d => d.type))]);

  cleaned.forEach(d => {
    d.episodes = +d.episodes;
    d.score = +d.score;
    d.scored_by = +d.scored_by;
    d.rank = +d.rank;
    d.popularity = +d.popularity;
    d.members = +d.members;
    d.favorites = +d.favorites;
    d.year = +d.year;});
  window.early = cleaned.filter(d => d.year < 1996); //window is the global variable
  window.midEra = cleaned.filter(d => d.year >= 1996 && d.year <= 2012);
  window.recent = cleaned.filter(d => d.year > 2012);

  addData(window.early);
  updateAnnotation(eraStep)

});

document.getElementById("nextEra").addEventListener("click", () => {
  const button = document.getElementById("nextEra");
  if (eraStep === 0) {
    addData(window.midEra);
    button.innerHTML = "Currently sho wing: pre-2012<br>Click to add 2012–2025";
    eraStep++;
  } else if (eraStep === 1) {
    addData(window.recent);
    button.innerHTML = "Currently showing: all eras<br>Click to reveal color options";
    eraStep++;
  } else if (eraStep === 2) {
    document.getElementById("colorControls").style.display = "block";
    button.disabled = true;
    button.innerHTML = "All data loaded"; //disables the "martini handle" part
    eraStep++;
  }
  updateAnnotation(eraStep)
});

function updateNodeColors() {
  svg.selectAll("circle")
    .transition().duration(500)
    .attr("fill", d => {
      if (colorMode == "genre") {
        return getColorByGenre(d);
      } else if (colorMode == "era") {
        return getColorByEra(d);
      } else if (colorMode == "score") {
        return getColorbyScore(d);
      }
      // } else if (colorMode == "type") {
      //  return getColorByType(d);
      // }
    })
    updateLegend();
;}


function updateLegend() {
  legend.selectAll("*").remove();  // clear existing legend items

  let domain, scale;

  if (colorMode == "genre") {
    domain = genres;
    scale = colorScale;
  } else if (colorMode == "era") {
    domain = ["Pre-1996", "1996–2012", "2013–2025"];
    scale = d3.scaleOrdinal()
      .domain(domain)
      .range(["#ff7f0e", "#d62728", "#1f77b4"]);
  } else if (colorMode == "score") {
    domain = ["10-9","9-8","8-7","7-6","6-5","5-4","4-3","3-2","2-1","1-0"]
    const sequential = d3.scaleSequential()
      .domain([1,10])  
      .interpolator(d3.interpolateBlues);

    const binMidpoints = [9.5, 8.5, 7.5, 6.5, 5.5, 4.5, 3.5, 2.5, 1.5, 0.5];
    scale = d3.scaleOrdinal()
      .domain(domain)
      .range(binMidpoints.map(sequential));    
  }
  
  domain.forEach((label, i) => {
    const row = legend.append("g")
      .attr("transform", `translate(0, ${i * (legendItemSize + legendSpacing)})`);
      // the $ is kind of like an f-string in python
    row.append("rect")
      .attr("width", legendItemSize)
      .attr("height", legendItemSize)
      .attr("fill", scale(label));

    row.append("text")
      .attr("x", legendItemSize + 6)
      .attr("y", legendItemSize / 2)
      .attr("dy", "9")
      .text(label)
});
}




function getColorByGenre(d) {
  return colorScale(d.primaryGenre);
}

function getColorByEra(d) {
  if (d.year < 1996) {return "#ff7f0e";}       
  else if (d.year <= 2012) {return "#d62728";}
  else {return "#1f77b4";}                     
}

// this doesn't work with years <3
/*
function getColorByType(d) {
  if (d.type == "ONA") {return "#ff7f0e";}       
  else if (d.type == "TV") {return "#9b69ffff";}
  else if (d.type == "Movie") {return "#dfff69ff";} 
  else if (d.type == "OVA") {return "#ff3c7aff";}
  else {return "#000204ff";}                     
} */

function getColorbyScore(d) {
  return scoreColorScale(d.score);
}

const scoreColorScale = d3.scaleSequential()
  .domain([0,10])
  .interpolator(d3.interpolateBlues);



const annotationGroup = svg.append("g")
  .attr("transform", `translate(20 , 20)`); // top-right-ish

const annotationBox = annotationGroup.append("rect")
  .attr("width", 400)
  .attr("height", 100)
  .attr("fill", "#ffffff")
  .attr("stroke", "#000")
  .attr("rx", 6)
  .attr("ry", 6)
  .attr("opacity", 0.8);

const annotationText = annotationGroup.append("text")
  .attr("x", 10)
  .attr("y", 20)
/*
const annotationS = [
  "Showing early anime (pre-1996)\n Pre-internet, reliant on physical distribution",
  "+ 1996–2012 era \n Rise of internet usage and video sharing",
  "+ 2013–2025 era \n Online streaming boom begins",
  "All data loaded.\n Choose additional filtering methods"
]; */

function updateAnnotation() {
  let lines; //const needs a value, let doesnt
  if (eraStep == 0) {
    lines = [
      "Showing early anime (pre-1996)",
      "Pre-internet, reliant on physical distribution"
    ];
  } else if (eraStep == 1) {
    lines = [
      "+ 1996–2012 era",
      "Rise of internet usage and video sharing"
    ];
  } else if (eraStep == 2) {
    lines = [
      "+ 2013–2025 era",
      "Online streaming boom",
      "Use color buttons to explore additional filtering"
    ];
  }
  annotationText.selectAll("tspan").remove();

  // Add each line as a <tspan>
  lines.forEach((line, i) => {
    annotationText.append("tspan")
      .text(line)
      .attr("x", 10)
      .attr("dy", 16);
  });
}


document.getElementById("colorGenre").addEventListener("click", () => {
  colorMode = "genre";
  updateNodeColors();
});

document.getElementById("colorEra").addEventListener("click", () => {
  colorMode = "era";
  updateNodeColors();
});

document.getElementById("colorScore").addEventListener("click", () => {
  colorMode = "score";
  updateNodeColors();
});
