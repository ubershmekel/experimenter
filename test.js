var myExperiment = {
    name: 'title-bg-color',
    variants: [
        {
            name: 'red',
            weight: 0.5,
            activate: function() {
                document.querySelector('h1').className = 'red-bg';
            },
        }
    ]
};

function restartExperiment() {
    clearExperiment(myExperiment);
}

function testMain() {
    initExperiment(myExperiment);
}
document.addEventListener('DOMContentLoaded', testMain, false);
 
