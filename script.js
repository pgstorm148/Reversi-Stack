// Context Free Art Javascript
"use strict";
const cfa = {
	canvas: document.querySelector("canvas"),
	stack: [],
	draws: [],
	// affine adjustments
	ajustments: {
		x(m, v) {
			m[4] += v * m[0];
			m[5] += v * m[1];
		},
		y(m, v) {
			m[4] += v * m[2];
			m[5] += v * m[3];
		},
		z(m, v) {
			m[11] += v;
		},
		rotate(m, v) {
			const rad = Math.PI * v / 180;
			const cos = Math.cos(rad);
			const sin = Math.sin(rad);
			const r00 = cos * m[0] + sin * m[2];
			const r01 = cos * m[1] + sin * m[3];
			m[2] = cos * m[2] - sin * m[0];
			m[3] = cos * m[3] - sin * m[1];
			m[0] = r00;
			m[1] = r01;
		},
		flip(m, v) {
			const rad = Math.PI * v / 180;
			const x = Math.cos(rad);
			const y = Math.sin(rad);
			const n = 1 / (x * x + y * y);
			const b00 = (x * x - y * y) / n;
			const b01 = 2 * x * y / n;
			const b10 = 2 * x * y / n;
			const b11 = (y * y - x * x) / n;
			const r00 = b00 * m[0] + b01 * m[2];
			const r01 = b00 * m[1] + b01 * m[3];
			m[2] = b10 * m[0] + b11 * m[2];
			m[3] = b10 * m[1] + b11 * m[3];
			m[0] = r00;
			m[1] = r01;
		},
		skew(m, v) {
			const x = Math.tan(Math.PI * v[0] / 180);
			const y = Math.tan(Math.PI * v[1] / 180);
			const r00 = m[0] + y * m[2];
			const r01 = m[1] + y * m[3];
			m[2] = x * m[0] + m[2];
			m[3] = x * m[1] + m[3];
			m[0] = r00;
			m[1] = r01;
		},
		scale(m, v) {
			let x, y;
			if (Array.isArray(v)) {
				x = v[0];
				y = v[1];
			} else {
				x = v;
				y = x;
			}
			m[0] *= x;
			m[1] *= x;
			m[2] *= y;
			m[3] *= y;
		},
		// colors adjust
		hue(m, v) {
			m[6] += v;
			m[6] %= 360;
		},
		sat(m, v) {
			this.adjustColor(m, v, 7);
		},
		bri(m, v) {
			this.adjustColor(m, v, 8);
		},
		alpha(m, v) {
			this.adjustColor(m, v, 9);
		},
		adjustColor(m, v, p) {
			if (v > 0) {
				m[p] += v * (1 - m[p]);
			} else {
				m[p] += v * m[p];
			}
		},
		raf(m, v) {
			m[10] = v ? 1 : 0;
		}
	},
	adjust(s, p) {
		const m = [
			s[0],  // a00
			s[1],  // a10
			s[2],  // a01
			s[3],  // a11
			s[4],  // tx
			s[5],  // ty
			s[6],  // hue
			s[7],  // saturation
			s[8],  // brillance
			s[9],  // alpha
			s[10], // z-index
			s[11], // raf
			s[12]  // primitive
		];
		for (const c in p) {
			this.ajustments[c](m, p[c]);
		}
		return m;
	},
	// primitives
	setTransform(s) {
		this.ctx.setTransform(
			-this.scale * s[0],
			this.scale * s[1],
			this.scale * s[2],
			-this.scale * s[3],
			this.scale * s[4] + this.offsetX,
			-this.scale * s[5] + this.offsetY
		);
	},
	CIRCLE(s, p = null) {
		this.primitive(s, p, 0);
	},
	SQUARE(s, p = null) {
		this.primitive(s, p, 1);
	},
	TRIANGLE(s, p = null) {
		this.primitive(s, p, 2);
	},
	primitive(s, p, i) {
		p && (s = this.adjust(s, p));
		s[12] = i;
		this.draws.push(s);
		this.bbox(s);
	},
	0(s) {
		// CIRCLE
		this.setTransform(s);
		this.fillStyle(s);
		this.ctx.beginPath();
		this.ctx.arc(0, 0, 0.5, 0, 2 * Math.PI);
		this.ctx.fill();
	},
	1(s) {
		// SQUARE
		this.setTransform(s);
		this.fillStyle(s);
		this.ctx.fillRect(-0.5, -0.5, 1, 1);
	},
	2(s) {
		// TRIANGLE
		this.setTransform(s);
		this.fillStyle(s);
		this.ctx.beginPath();
		this.ctx.moveTo(0, 0.577350269);
		this.ctx.lineTo(-0.5, -0.28867513);
		this.ctx.lineTo(0.5, -0.28867513);
		this.ctx.lineTo(0.0, 0.577350269);
		this.ctx.closePath();
		this.ctx.fill();
	},
	fillStyle(s) {
		this.ctx.fillStyle = `hsla(${Math.round(s[6])},${Math.round(
			s[7] * 100
		)}%,${Math.round(s[8] * 100)}%,${s[9]})`;
	},
	bbox(s) {
		const x = s[4] * this.scale;
		const y = s[5] * this.scale;
		if (x < this.rect[0]) this.rect[0] = x;
		else if (x > this.rect[1]) this.rect[1] = x;
		if (y < this.rect[2]) this.rect[2] = y;
		else if (y > this.rect[3]) this.rect[3] = y;
	},
	center(s) {
		const br = this.rect;
		const scale =
			Math.min(this.width / (br[1] - br[0]), this.height / (br[3] - br[2])) * s;
		this.scale *= scale;
		this.offsetX = this.width * 0.5 - (br[0] + br[1]) * 0.5 * scale;
		this.offsetY = this.height * 0.5 + (br[3] + br[2]) * 0.5 * scale;
	},
	// rendering iterator
	*render() {
		let s = 0;
		for (const draw of this.draws) {
			this[draw[12]](draw);
			if (s++ > this.speed && draw[10]) {
				s = 0;
				yield requestAnimationFrame(_ => this.iter.next());
			}
		}
		yield requestAnimationFrame(_ => this.iter.next());
	},
	// call shape
	call(name, s, p) {
		const x = (s[0] * s[0] + s[1] * s[1]) * this.scale;
		const y = (s[2] * s[2] + s[3] * s[3]) * this.scale;
		if (x < this.minSize && y < this.minSize) {
			// too small
			return;
		}
		s = this.adjust(s, p);
		s[12] = this.shape[name];
		this.stack.push(s);
	},
	run(code) {
		// inject code
		this.shape = {};
		let k = 3;
		for (const rule in code) {
			this.shape[rule] = k;
			this[k++] = code[rule];
		}
		// reset canvas
		this.ctx = this.canvas.getContext("2d");
		this.width = this.canvas.width = this.canvas.offsetWidth * 2;
		this.height = this.canvas.height = this.canvas.offsetHeight * 2;
		if (code.setup.background) {
			this.ctx.fillStyle = code.setup.background;
			this.ctx.fillRect(0, 0, this.width, this.height);
		}
		// init setup
		this.rect = [0, 0, 0, 0];
		this.stack.length = 0;
		this.draws.length = 0;
		this.scale = 100;
		this.speed = code.setup.speed || 100;
		this.minSize = code.setup.minSize || 1.0;
		// push start shape
		this.call(code.setup.start, [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0], false);
		// run rules
		const t1 = performance.now();
		let iter = 0;
		do {
			iter++;
			const s = this.stack.shift();
			this[s[12]](s);
		} while (this.stack.length);
		const t2 = performance.now();
		console.log(iter, t2 - t1);
		// zSorting
		if (code.setup.zSorting) {
			this.draws.sort(function(d0, d1) {
				return d0[11] - d1[11];
			});
		}
		// centering
		this.center(code.setup.zoom || 1.0);
		// start rendering loop
		this.iter && (this.iter.return());
		this.iter = this.render();
		this.iter.next();
	}
};
["click", "touchdown"].forEach(event => {
	document.addEventListener(event, e => cfa.run(code), false);
});
/////////////////////////////////////////////
const code = {
	setup: {
		background: "#fff",
		minSize: 0.01,
		zoom: 0.42,
		speed: 3,
		start: "start"
	},
	start(s) {
		this.call("pyramid", s, {
			hue: Math.random() * 360,
			sat: 0.85
		});
	},
	pyramid(s) {
		this.SQUARE(s, { bri: -1, alpha: -0.97, scale: 1.3, raf: false});
		this.SQUARE(s, { bri: -1, scale: 1.01, raf: false });
		this.SQUARE(s, { bri: 0.8, raf: true });
		this.call("pyramid", s, {
			flip: (Math.random() - Math.random()) * 6,
			hue: Math.random() * 14 - 7,
			x: Math.random() * 0.14 - 0.07,
			scale: 0.99
		});
	}
};
cfa.run(code);