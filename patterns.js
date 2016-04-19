var $ = function(s) {return document.querySelector(s);};

var escapes = {
	"a": "Any letter",
	"A": "Any non-letter character",
	"c": "Any control character",
	"C": "Any non-control character",
	"d": "Any digit",
	"D": "Any non-digit",
	"g": "Any non-space character",
	"G": "The space character",
	"l": "Any lowercase letter",
	"L": "Any non-lowercase character",
	"u": "Any uppercase letter",
	"U": "Any non-uppercase character",
	"x": "Any hexadecimal digit",
	"X": "Any non-hexadecimal character",
	"w": "Any alphanumeric character",
	"W": "Any non-alphanumeric character"
};

var patternBox = $("#pattern");
var testBox = $("#test");
var errorSpan = $("#error");

Lua.initialize();

function prepTest() {
	var code = `function(pattern, test, cursor)
	return pcall(function()
			if test:find("[%[{}]") then
				error("the characters [{} cannot be tested against on this site")
			end
			if pattern:find("%%%d") then
				error("capture matching (e.g. '%1') is not supported on this site")
			end
			if not test:find(pattern) then
				if cursor > -1 then
					return test:sub(0, cursor) .. "|" .. test:sub(cursor + 1)
				else
					return test
				end
			end
			local newPattern = "()" .. pattern:gsub("([^%%])[()]", "%1()"):gsub("^%(", "()") .. "()"
			local parens = {}
			for t in pattern:gmatch("[()]") do
				table.insert(parens, t)
			end
			local out = test:gsub(newPattern, function(...)
									  local captures = {...}
									  local pos = table.remove(captures, 1)
									  local epos = table.remove(captures)
									  if pos ~= epos then
										  local count = 0
										  local newmatch = ""
										  local e = pos
										  for i, v in ipairs(captures) do
											  local kind = parens[i]
											  count = count + (kind == "(" and 1 or 0)
											  newmatch = newmatch .. test:sub(e, v - 1)
												  .. (kind == "(" and "[" .. count or "]")
											  e = v
										  end
										  newmatch = newmatch .. test:sub(e, epos - 1)
										  newmatch = "{" .. newmatch .. "}"
										  return newmatch
									  end
			end)
			if cursor > -1 then
				local apos = 0
				local i = 0
				while apos <= cursor do
					local char = out:sub(i, i)
					if not char:find("[%[%]{}]") then
						apos = apos + 1
					end
					if char == "[" and out:sub(i+1, i+1):find("%d") then
						i = i + 2
					else
						i = i + 1
					end
				end
				out = out:sub(0, i - 1) .. "|" .. out:sub(i)
			end
			return out
	end)
end`;
	return code;
}

function updateTest() {
	var test = testBox.textContent.replace(/\u00A0/g, " ");
	var pattern = patternBox.textContent.replace(/\u00A0/g, " ");
	var sel = rangy.saveSelection();
	var sspanid = document.getElementsByClassName("rangySelectionBoundary")[0].id;
	var cursor = testBox.innerHTML
			.replace(/<span class="group".*?>|<\/span>/g, "")
			.replace(/&nbsp;/g, " ")
			.indexOf("<");
	var res = Lua.eval(prepTest())[0](pattern, test, cursor);
	var worked = res[0];
	if (worked) {
		errorSpan.style.display = "none";
		var newHTML = res[1];
		newHTML = newHTML
			.replace(/ /g, "&nbsp;")
			.replace(/{/g, '<span class="group" data-level="0">')
			.replace(/}/g, "</span>")
			.replace(/\|/g, '<span id="' + sspanid + '"></span>')
			.replace(/\[(\d)/g, '<span class="group" data-level="$1">')
			.replace(/\]/g, '</span>');
		testBox.innerHTML = newHTML;
	} else {
		errorSpan.style.display = "inline";
		errorSpan.innerHTML = "Error: " + res[1].replace(/.*?:.*?: /, "");
		testBox.innerHTML = testBox.innerHTML
			.replace(/ (?!([^<]+)?>)/g, "&nbsp;")
			.replace(/<span class="group".*?>|<\/span>/g, "");
	}
	rangy.restoreSelection(sel);
	var br = $("#test > br");
	if (br) {
		testBox.removeChild(br);
	}
	return worked;
}

function updatePattern(worked) {
	var text = patternBox.textContent;
	var focused = document.activeElement == patternBox;
	if (focused) {
		var sel = rangy.saveSelection();
		var sspanid = document.getElementsByClassName("rangySelectionBoundary")[0].id;
	}

	if (focused) {
		var cursor = patternBox.innerHTML
				.replace(/<span class="group".*?>|<\/span>/g, "")
				.replace(/&nbsp;/g, " ")
				.indexOf("<");
	}
	
	var newHTML = text;

	function makeSpan(title, text) {
		return '<span class="doc" title="' + title + '">' + text + '</span>';
	}

	if (focused) {
		newHTML = newHTML.slice(0, cursor)
			+ '<span id="' + sspanid + '"></span>'
			+ newHTML.slice(cursor);
	}
	patternBox.innerHTML = newHTML
		.replace(/ (?!([^<]+)?>)/g, "&nbsp;")
		.replace(new RegExp('%(?:<span id="' + sspanid + '"></span>)?([^<])', 'g'),
				 function(match, cap) {
					 console.log(cap);
					 if (cap) {
						 if (escapes[cap]) {
							 return makeSpan(escapes[cap], match);
						 } else {
							 return makeSpan('The character \'' + cap + '\'', match);
						 }
					 } else {
						 return match
					 }
				 });
	var br = $("#pattern > br");
	if (br) {
		patternBox.removeChild(br);
	}
	if (focused) {
		rangy.restoreSelection(sel);
	}
}

function getMatch() {
	updatePattern(updateTest());
}

patternBox.oninput = getMatch;
testBox.oninput = getMatch;

window.onload = getMatch;
