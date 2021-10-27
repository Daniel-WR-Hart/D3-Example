import * as d3 from 'd3';
import d3Tip from 'd3-tip';

// Exercise from Lesson_39

const maxWidth = 600;
const maxHeight = 350;
const padding = 0.2;
const margin = { left: 100, right: 10, top: 10, bottom: 100 };
const chartWidth = maxWidth - margin.left - margin.right;
const chartHeight = maxHeight - margin.top - margin.bottom;

// Moving the chart area with CSS must be done carefully to make sure that by tips don't appear misplaced. It's safer to shift the actual element, rather than only shift where it is painted.
const chartArea = document.getElementById('chart-area');
chartArea.style.width = 'max-content';
// chartArea.style.transform = 'translate(calc(50vw - 50%), 10vh)';
chartArea.style.margin = 'auto';

const svg = d3.select('#chart-area')
    .append('svg')
    .attr('width', maxWidth)
    .attr('height', maxHeight)
    .attr('style', 'background-color: white');

const chartGroup = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

// Labels
const xLabel = chartGroup.append('text')
    .attr('class', 'x-axis-label')
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .attr('x', chartWidth / 2)
    .attr('y', chartHeight + 40)
    .text('GDP Per Capita ($)');

const yLabel = chartGroup.append('text')
    .attr('class', 'y-axis-label')
    .attr('font-size', '20px')
    .attr('text-anchor', 'middle')
    .attr('x', -chartHeight / 2)
    .attr('y', -40)
    .attr('transform', 'rotate(-90)')
    .text('Life Expectancy (Years)');

const yearLabel = chartGroup.append('text')
    .attr('class', 'year-label')
    .attr('font-size', '30px')
    .attr('text-anchor', 'right')
    .attr('x', chartWidth - 60)
    .attr('y', chartHeight - 10)


// Axes
const xAxisGroup = chartGroup.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${chartHeight})`);

const yAxisGroup = chartGroup.append('g')
    .attr('class', 'y-axis');


const continents = ['africa', 'americas', 'asia', 'europe'];


// Tooltip
// const tip = d3.tip()
const tip = d3Tip()
    .attr('class', 'd3-tip')
    .html((event) => {
        // This part is different from the (old) tutorial, where __data__ was the thing passed to this callback instead of an event
        const d = event.target.__data__;
        const red = 'color:red';
        return `
            <strong>Country:</strong> <span style='${red}'>${d.country}</span><br>
            <strong>Continent:</strong> <span style='${red}; text-transform:capitalize'>${d.continent}</span><br>
            <strong>Life Expectancy:</strong> <span style='${red}'>${d3.format('.2f')(d.life_exp)}</span><br>
            <strong>GDP Per Capita:</strong> <span style='${red}'>${d3.format('$,.0f')(d.income)}</span><br>
            <strong>Population:</strong> <span style='${red}'>${d3.format(',.0f')(d.population)}</span><br>
        `;
    });
svg.call(tip); // Add the tip to the dom


// Scales
const color = d3.scaleOrdinal()
    .domain(continents)
    .range(['blue', 'lightblue', '#d73', '#fca']);

const y = d3.scaleLinear()
    .domain([0, 90])
    .range([0, chartHeight]);

const yAxisScale = d3.scaleLinear()
    .domain([0, 90])
    .range([chartHeight, 0]);

const x = d3.scaleLog()
    .domain([200, 100000])
    .range([1, chartWidth])
    .base(10);

const p = d3.scaleLinear()
    .domain([0, 5e8])
    .range([3, 20]);




const legend = chartGroup.append('g')
    .attr('transform', `translate(${chartWidth - 10}, ${chartHeight - 125})`);

continents.forEach((continent, i) => {
    const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
    
    legendRow.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', color(continent));

    legendRow.append('text')
        .attr('x', -10)
        .attr('y', 10)
        .attr('text-anchor', 'end')
        .style('text-transform', 'capitalize')
        .text(continent);
});



let timeIndex = 0;
let isPlaying = false;
let totalYears;
let cleanedData;
let intervalId;

d3.json('CountryGDP.json').then((data) => {
    // Clean data - filter out all data points with incomplete information, rather than toggle their visibility
    // The tutorial shows that all numbers are explicitly turned into strings, but this isn't necessary since the used json data already has the numbers in number format
    cleanedData = data.map((yearStats) => {
        yearStats.countries = yearStats.countries.filter((country) => {
            return country.income && country.life_exp && country.population;
        });
        return yearStats;
    });

    totalYears = cleanedData.length;
    step();
});

function step() {
    const currentData = cleanedData[timeIndex];
    update(currentData);
    timeIndex++;

    if (timeIndex === totalYears) {
        timeIndex = 0;
    }
}

document.getElementById('reset-button').addEventListener('click', () => {
    timeIndex = 0;
    step();
});
document.getElementById('play-pause-button').addEventListener('click', (event) => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        event.target.textContent = 'Pause';
        intervalId = setInterval(step, 100);
    }
    else {
        event.target.textContent = 'Play';
        clearInterval(intervalId);
    }
});


function update({ countries, year }) {
    yearLabel.text(year);

    // JOIN
    const circles = chartGroup.selectAll('circle')
        // .data(countries);
        .data(countries, (country) => country.country);

    // EXIT old elements not present in new data
    circles.exit().remove();


    // ENTER
    circles.enter()
        .append('circle')
        .attr('fill', (country) => color(country.continent))
        .attr('opacity', 0.5)
        .attr('cx', (country) => Math.round(x(country.income)))
        .attr('cy', (country) => chartHeight - Math.round(y(country.life_exp)))
        .attr('r', (country) => Math.round(p(country.population)))
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        // UPDATE
        .merge(circles)
        .transition(d3.transition().duration(100))
            .attr('cx', (country) => Math.round(x(country.income)))
            .attr('cy', (country) => chartHeight - Math.round(y(country.life_exp)))
            .attr('r', (country) => Math.round(p(country.population)));

    const xAxisCall = d3.axisBottom(x)
        .ticks(3)
        .tickValues([400, 4000, 40000])
        .tickFormat((d) => '$' + d)
        // .tickFormat(d3.format('$'))
        // .tickFormat((d, i) => ['bad', 'not bad', 'nice'][i])
        // .tickSize(-10)
        // .tickSize(10)
    xAxisGroup.call(xAxisCall);

    const yAxisCall = d3.axisLeft(yAxisScale)
    yAxisGroup.call(yAxisCall);
}
