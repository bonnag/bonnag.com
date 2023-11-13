# Bonnag Blog

## 2023-11-13

For the first time, I 3d printed something useful.

I figured I'd try writing code to generate the 3d model.

This way there's less fiddly clicking and dragging about, plus it opens up the possibility of more exciting things in future - like procedural physical object generation.

Or even AI generated physical objects (is that wise?).

I used https://openscad.org/ to turn simple instructions into 3d models that BambuStudio could print. It reminded me a bit of using [Logo to move turtles](https://www.transum.org/software/Logo/).

Here's the code - can you guess what it is yet?

```
// the final part is made up of the first part,
// with the other parts removed:
difference() {
    // first (outer) part
    // make the outer 3d shape by converting the following 2d shape,
    // shrinking it a little bit as it goes up:
    linear_extrude(height = 90, center = true, scale=0.92) {
        // this is the 2d shape that gets extruded to the outer shape,
        // imagine an elastic band around two separated circles:
        hull() {
            translate([0,-66,0]) circle(30);
            translate([0,+66,0]) circle(30);
        }
    };
    // the two identical cylinder shaped holes that get cut out near the ends:
    translate([0,-64,10]) cylinder (h = 80, r = 20, center = true);
    translate([0,+64,10]) cylinder (h = 80, r = 20, center = true);
    // the larger hole for the toothpase in the middle is made in
    // a similar way to the outer shape - by taking a 2d shape and
    // "extruding" it vertically:
    translate([0,0,10]) {
        linear_extrude(height = 80, center = true) {
            // the 2d shape is an elastic band around two seperated
            // circles again:
            hull() {
                translate([0,-20,0]) circle(20);
                translate([0,+20,0]) circle(20);
            }
        };
    };
    // the final bit we cut-out is some text so we know which
    // hole is which. we move the text to the front:
    translate([-28,0,0]) {
        // the text starts off lying down, so we have to rotate it.
        // we rotate by slightly less than 90 degrees because the
        // outer part shrinks as it gets nearer the top:
        rotate([88, 0, -90]) {
            // make the text go from 2d to not-very-deep 3d:
            linear_extrude(height = 3) {
                text(text = "C & S", size = 20, halign="center");
            }
        }
    }
}
```

No idea? Well, it's a toothbrush holder:

TODO

And in physical form:

TODO

Took about two hours to figure out how to make OpenSCAD and BambuStudio do what I want, and about three hours to print.

Unusually, this was almost cost-effective (well, ignoring the cost of the printer!) - about £2 of filament.
