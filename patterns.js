var $ = function(s) {return document.querySelector(s)};

var patternBox = $("#pattern");
var testBox = $("#test");

Lua.initialize();

var prepTest = function() {
	var code = 'function(pattern, test, cursor)\n\
local newPattern = "()" .. pattern:gsub("[()]", "()") .. "()"\n\
local parens = {}\n\
for t in pattern:gmatch("[()]") do\n\
	table.insert(parens, t)\n\
end\n\
local out = test:gsub(newPattern, function(...)\n\
						  local captures = {...}\n\
						  local pos = table.remove(captures, 1)\n\
						  local epos = table.remove(captures)\n\
						  if pos ~= epos then\n\
							  local count = 0\n\
							  local newmatch = ""\n\
							  local e = pos\n\
							  for i, v in ipairs(captures) do\n\
								  local kind = parens[i]\n\
								  count = count + (kind == "(" and 1 or 0)\n\
								  newmatch = newmatch .. test:sub(e, v - 1)\n\
									  .. (kind == "(" and "[" .. count .. ")" or "]")\n\
								  e = v\n\
							  end\n\
							  newmatch = newmatch .. test:sub(e, epos - 1)\n\
							  newmatch = "{" .. newmatch .. "}"\n\
							  return newmatch\n\
						  end\n\
end)\n\
if cursor > -1 then\n\
local apos = 0\n\
local i = 0\n\
while apos <= cursor do\n\
	local char = out:sub(i, i)\n\
	if not char:find("[%[%]{}]") then\n\
		apos = apos + 1\n\
	end\n\
	if char == "[" and out:sub(i+1, i+1):find("%d") and out:sub(i+2, i+2) == ")" then\n\
		i = i + 3\n\
	else\n\
		i = i + 1\n\
	end\n\
end\n\
out = out:sub(0, i - 1) .. "|" .. out:sub(i)\n\
end\n\
return out\n\
end';
	return code;
}

var updateTest = function() {
	var test = testBox.textContent.replace(/\u00A0/g, " ");
	var pattern = patternBox.textContent;
	var sel = rangy.saveSelection();
	var sspanid = document.getElementsByClassName("rangySelectionBoundary")[0].id;
	var cursor = testBox.innerHTML.replace(/<span class="group".*?>|<\/span>/g, "").indexOf("<");
	var res = Lua.eval(prepTest())[0](pattern, test, cursor);
	var newHTML = res[0];
	newHTML = newHTML
		.replace(/ /g, "&nbsp;")
		.replace(/{/g, '<span class="group" data-level="0">')
		.replace(/}/g, "</span>")
		.replace(/\|/g, '<span id="' + sspanid + '"></span>')
		.replace(/\[(\d)\)/g, '<span class="group" data-level="$1">')
		.replace(/\]/g, '</span>');
	testBox.innerHTML = newHTML;
	rangy.restoreSelection(sel);
}

var getMatch = function() {
	updateTest();
}

patternBox.oninput = getMatch;
testBox.oninput = getMatch;

window.onload = getMatch;
