let µ=require("morgas");

module.exports=µ.Class({
	constructor:function(chapter,{filename="UNKNOWN",skip=false,duplicate=false}={})
	{
		this.chapter=chapter;
		this.chapterName=chapter.name;
		this.filename=filename;
		this.skip=skip;
		this.duplicate=duplicate;
	},
	getMessage(display)
	{
		let parts=[];
		if(display.duplicate) parts.push(this.duplicate?"D":" ");
		if(display.skip) parts.push(this.skip?"S":" ");
		if(display.filename) parts.push(this.filename);
		parts.push(this.chapterName);
		return parts.join(" ");
	}
});