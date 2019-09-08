let {AutoComplete}=require("enquirer");
let µ=require("morgas");
let SC=µ.shortcut({
	Helper:"FileHelper",
	File:"File"
});

const hint="(left & right to navigate folders)";
let getPathChoices = async function()
{
	let absolute=this.helper.getAbsolutePath();
	let list=await this.helper.ls();
	let dirList=(await Promise.all(
		list.map(p=>this.isDirectory(p).then(dir=>[dir,p]))
	))
	.filter(([dir,name])=>dir);
	dirList.unshift([true,"."]); // last choice for "end" folders
	return dirList.map(([dir,name])=>({message:name,value:absolute+"/"+name}));
};
module.exports=class PathPrompt extends AutoComplete
{
	constructor(options={})
	{
		options.choices=getPathChoices;
		options.hint=hint
		super(options);
		this.helper=new SC.Helper(options.path);
	}
	header()
	{
		return this.helper.getAbsolutePath();
	}
	isDirectory(input)
	{
		return new SC.File(this.helper.getAbsolutePath()).changePath(input).stat().then(stat=>stat.isDirectory(),()=>false);
	}

	left()
	{
		let prevName=this.helper.file.getFileName();
		this.helper.changeDirectory("..");
		this.reset().then(()=>
		{
			this.index=this.choices.findIndex(c=>c.message===prevName);
			this.render();
		});
		this.render();
	}
	right()
	{
		if(this.focused)
		this.helper.changeDirectory(this.focused.message);
		this.input="";
		this.cursor=0;
		this.index=0;
		return this.reloadChoices();
	}
	async suggest(input = this.input, choices = this.state._choices)
	{
		if(input.match(/(\\|\/)$/))
		{
			if(await this.isDirectory(input))
			{
				this.helper.changeDirectory(input);
				this.input="";
				this.cursor=0;
				this.index=0;
				this.reloadChoices();
			}
			return [];
		}
		return choices.filter(c=>c.message.toLowerCase().includes(input.toLowerCase()));
	}
	reloadChoices()
	{
		let p=this.reset().then(()=>this.render());
		this.render();
		return p;
	}
};