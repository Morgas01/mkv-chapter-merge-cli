
let Enquirer=require("enquirer");
let SC=require("morgas").shortcut({
	Helper:"FileHelper",
	File:"File"
})

const selectHint="(space=toggle, a=toggle all, i=invert, enter=finish)"
let getFiles=async function(path)
{
	let base=new SC.File(path);
	let list=await base.listFiles()
	return (await Promise.all(
		list.map(f=>
			base.clone().changePath(f).stat().then(s=>[s.isFile(),f],()=>[false])
		)
	))
	.filter(e=>e[0]).map(e=>e[1]);
};

module.exports=async function({path=".",limit=10,exitText="exit",outStream=process.stdout}={})
{
    let enquirer=new Enquirer({limit});
    enquirer.register("pathprompt",require("../prompts/PathPrompt"));
    enquirer.register("optionsprompt",require("../prompts/OptionsPrompt"));
    let prompt=enquirer.prompt.bind(enquirer);

    path=SC.File.fileToAbsoluteString(path);

	let files=await getFiles(path);

	let options={
		skipHidden:true
	};


	let change=async ()=>(await prompt({
		type:"pathprompt",
		name:"path",
		path,
		message:"choose folder"
	})).path;

	let select=async ()=>
	{
		list=await getFiles(path);
		let choices=list.filter(f=>!files.includes(f));
		if(choices.length==0)
		{
			outStream.write("all files already selected.\n");
			return [];
		}
		return (await prompt({
			type:"multiselect",
			name:"select",
			hint:selectHint,
			message:"add to selected",
			choices,
			multiple:true
		})).select
	};

	let deselect=async ()=>
	{
		if(files.length==0)
		{
			outStream.write("no files selected.\n");
			return [];
		}
		return (await prompt({
			type:"multiselect",
			hint:selectHint,
			name:"deselect",
			message:"add to deselected",
			choices:files.slice(),
			multiple:true
		})).deselect;
	};

	let selectOptions=async ()=>
	{
		options=(await prompt({
			type:"optionsprompt",
			name:"options",
			message:"options",
			choices:[
				{
					name:"skipHidden",
					message:"parse hidden chapters",
					choices:[
						{name:"Yes",value:false,selected:!options.skipHidden},
						{name:"No",value:true,selected:options.skipHidden},
					]
				}
			],
			multiple:true
		})).options;
	}

	let sort=async ()=>{
		if(files.length==0)
		{
			outStream.write("no files selected.\n");
			return [];
		}

		let result=await prompt({
			type:"sort",
			name:"sort",
			hint:"(Use <shift>+<up/down> to sort; first displayed item will be first in list!)",
			message:"sort files",
			choices:files.slice()
		});
		return result.sort;
	}

	let parse=require("./parse");

	let menuIndex=0;
	let menu=async ()=>
	{
		return (await new enquirer.prompts.select({
			type:"select",
			header:()=>`${path}	(${files.length} files)`,
			message:"select an action",
			index:menuIndex,
			name:"action",
			choices:[
				"change path",
				"select files",
				"deselect files",
				"sort files",
				"options",
				"parse chapters",
				exitText
			],
			onSubmit:function(){menuIndex=this.index}
		}).run());
	};

	let isExit=false;
	while(!isExit)
	{
		let action=await menu();
		try
		{
			switch(action)
			{
				case "change path":
					path= await change();
					files=await getFiles(path);
				case "sort files":
					files=await sort();
					break;
				case "select files":
					let selected=await select();
					files.push(...selected);
					break;
				case "deselect files":
					let toDeselect=await deselect();
					files=files.filter(f=>!toDeselect.includes(f));
					break;
				case "options":
					await selectOptions();
					break;
				case "parse chapters":
					await parse({
						files:files.map(f=>new SC.File(path).changePath(f)),
						outStream,
						path,
						enquirer,
						options,
					});
					break;
				case exitText:
					return;
				default:
					console.log(action,exitText);
			}
		}
		catch(error)
		{
			if(error)console.error(error)
		}
	}

};