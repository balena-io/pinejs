a1 = [0, 1, [0, 1, 2, [0, 1, 2, 3, [0]]]];
b1 = [2,3,4];
c1 = 1;

function ins(a,b,c){
	var p = jQuery.extend(true, [], a);
	
	var ref_in_p = p[b[0]];

	for(var i=1;i<b.length;i++){
		ref_in_p = ref_in_p[b[i]];
	}

	ref_in_p.push(c);
	
	return p;
}

a1 = ins(a1,b1,c1);

console.log(a1.toString());


