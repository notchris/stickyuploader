const {ipcRenderer} = require('electron')

let app = new Vue({
    el: '#app',
    data: {
        width: window.innerWidth,
        height: window.innerHeight
    },
    mounted() {
        // Set up the canvas and shapes
        var event = new Event('build');
        document.querySelector('#app').dispatchEvent(event);

        var s1 = new Konva.Stage({
            container: 'container',
            width: this.width,
            height: this.height
        });
        var layer1 = new Konva.Layer({
            draggable: false
        });
        s1.add(layer1);

        // draw a background rect to catch events.
        var r1 = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.width,
            height: this.height,
            fill: 'transparent'
        })
        layer1.add(r1)

        var r2 = new Konva.Rect({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            stroke: 'red',
            dash: [2, 2]
        })
        r2.listening(false)
        layer1.add(r2)


        s1.draw()
        var posStart;
        var posNow;
        var mode = '';

        function startDrag(posIn) {
            posStart = {
                x: posIn.x,
                y: posIn.y
            };
            posNow = {
                x: posIn.x,
                y: posIn.y
            };
        }

        function updateDrag(posIn) {
            posNow = {
                x: posIn.x,
                y: posIn.y
            };
            var posRect = reverse(posStart, posNow);
            r2.x(posRect.x1);
            r2.y(posRect.y1);
            r2.width(posRect.x2 - posRect.x1);
            r2.height(posRect.y2 - posRect.y1);
            r2.visible(true);
            s1.draw();
        }

        r1.on('mousedown', function(e) {
            mode = 'drawing';
            startDrag({
                x: e.evt.layerX,
                y: e.evt.layerY
            })
        })

        r1.on('mousemove', function(e) {
            if (mode === 'drawing') {
                updateDrag({
                    x: e.evt.layerX,
                    y: e.evt.layerY
                })
            }
        })

        r1.on('mouseup', function(e) {
            mode = '';
            r2.visible(false);
            let ss = {
            	x: r2.x(),
            	y: r2.y(),
            	width: r2.width(),
            	height: r2.height()
            }
            s1.draw();
            ipcRenderer.send('screenshot', JSON.stringify(ss), 10);
        })

        // reverse drag
        function reverse(r1, r2) {
            var r1x = r1.x,
                r1y = r1.y,
                r2x = r2.x,
                r2y = r2.y,
                d;
            if (r1x > r2x) {
                d = Math.abs(r1x - r2x);
                r1x = r2x;
                r2x = r1x + d;
            }
            if (r1y > r2y) {
                d = Math.abs(r1y - r2y);
                r1y = r2y;
                r2y = r1y + d;
            }
            return ({
                x1: r1x,
                y1: r1y,
                x2: r2x,
                y2: r2y
            });
        }

        window.addEventListener('resize', () => {
            this.width = window.innerWidth
            this.height = window.innerHeight
        })
    },
    methods: {}
})