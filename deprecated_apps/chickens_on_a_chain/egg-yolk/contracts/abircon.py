#!/usr/bin/python

import sys
import json

def tablevel(tbl):
	ret = ""
	if tbl < 0:
		return ""
	else:
		for i in xrange(tbl):
			ret = ret + "\t"
		return ret

def funcstrmkr(func, funcname, type):
	tbl = 0
	funcstr = ''
	# funcstr += "var "+funcname+" = function("
	funcstr += "Egg.prototype." + funcname + " = function("
	flg = False;
	for inp in func["inputs"]:
		if(flg): 
			funcstr += ", "
		funcstr += inp["name"]
		flg = True
	if (flg): 
		funcstr += ", "
	funcstr += "cb){\n"
	tbl += 1
#	funcstr += tablevel(tbl) + "var GC = getContract(account);\n"
	funcstr += tablevel(tbl) + "if (!this.egg) return cb(new Error(\'Egg contract has not been initialized\'));\n"
	funcstr += tablevel(tbl) + "egg." + funcname

	if type == "get":
		funcstr = funcstr + ".call("
	elif type == "post":
		funcstr = funcstr + ".sendTransaction("

	for inp in func["inputs"]:
		funcstr += inp["name"] + ", "

	funcstr += "function(err, result){\n"
	tbl += 1
	funcstr += tablevel(tbl) + "if(err) return cb(err, null);\n"
	funcstr += tablevel(tbl) + "return cb(null"

	if type == "get":
		funcstr += ", result.values"
	else:
		for oup in func["outputs"]:
			funcstr += ", result.values." + oup["name"]
	funcstr += ");\n"
	tbl -= 1
	funcstr += tablevel(tbl) + "})\n"
	tbl -= 1
	funcstr += "}\n\n"

	return funcstr


#Read the abi
infile = sys.argv[1]
outfile = sys.argv[2]
inf = open(infile,'r')
jo = json.load(inf)
inf.close()

Magic = False

#One by One take each function of the abi and compose the rest endpoint

restfuncs = []

modstr = "\nmodule.exports = {\n"

for func in jo:
	if (func["type"] == "function"):
		modstr += tablevel(1) + func["name"] + ":" + func["name"] + ",\n"
		if (func["constant"] == False): 
			restfuncs.append(funcstrmkr(func, func["name"], "post"))
		else:
			restfuncs.append(funcstrmkr(func, func["name"],"get"))

modstr += "}\n\n"

#Now print out to file
ouf = open(outfile,'w')
#ouf.write("//Don't forget to set the output formatter to json!\n")
#ouf.write("contract.setOutputFormatter(erisC.outputFormatter.jsonStrings)\n\n")
#ouf.write("//Restify endpoints. Copy into appropriate section\n\n")
ouf.write(modstr)
for rf in restfuncs:
	ouf.write(rf)

ouf.close()



