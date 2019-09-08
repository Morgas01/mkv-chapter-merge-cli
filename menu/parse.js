let api=require("..");
let Enquirer=require("enquirer");
let SC=require("morgas").shortcut({
	Helper:"FileHelper",
	File:"File",
	utils:"File/util",
	flatten:"flatten",
	register:"register",
	mapRegister:"mapRegister",
});
let EditableChapter=require("../menu/chapters/EditableChapter");
let ChapterEditor=require("../prompts/ChapterEditor");

let getEditableChapters=function(fileInfos)
{
	let rtn=[];
	let register=SC.register(2,()=>({chapter:null,parsed:[]}));
	for(let fInfo of fileInfos)
	{
		for(let chapter of fInfo.chapters)
		{
			let segment=chapter.ChapterSegmentUID.data.toString("hex");

			let edition=chapter.ChapterSegmentEditionUID?chapter.ChapterSegmentEditionUID.data:"";
			let registerEntry=register[segment][edition];
			let uniqueChapter=registerEntry.chapter
			if(!uniqueChapter)
			{
				uniqueChapter=registerEntry.chapter=chapter;
			}
			if(registerEntry.parsed.length==1)registerEntry.parsed[0].duplicate=true;
			let ediable=new EditableChapter(uniqueChapter,{filename:fInfo.file.getName(),duplicate:registerEntry.parsed.length>0});
			registerEntry.parsed.push(ediable);
			rtn.push(ediable);
		}
	}
	return rtn;
};

module.exports=async function ({files,outStream,path,enquirer=new Enquirer(),limit=enquirer.options.limit||10,options:{skipHidden=true}={}})
{
	outStream.write("parsing...\n");
	let fileInfos=await api.getChapters(files,{skipHidden}).catch(e=>{console.error(e);return []});
	outStream.write("mapping...\n");
	fileInfos.forEach(f=>f.chapters=f.chapters.map(c=>api.createOrderedChapter(c,f)));

	let chapters=getEditableChapters(fileInfos);

	let chapterMenuIndex=0;
	let chapterMenu=()=>
	{
		return new enquirer.prompts.select({
			header:chapters.filter(c=>!c.skip).length+"/"+chapters.length+" Chapters",
			message:"select an action",
			index:chapterMenuIndex,
			choices:[
				{
					message:"edit chapter",
					value:"edit"
				},
				{
					message:"merge chapters",
					value:"merge"
				},
				{
					message:"back",
					value:"back"
				}
			],
			onSubmit:function(){chapterMenuIndex=this.index}
		}).run();
	};
	let edit=async ()=>
	{
		return chapters=await(new ChapterEditor({
			message:"edit",
			choices:chapters,
			limit
		}).run());
	};
	let merge= async()=>
	{
		let output = await SC.utils.findUnusedName(new SC.File(path).changePath("merged.mkv"));
		let outFile=new SC.File(output);
		await api.mergeChapters(chapters.filter(e=>!e.skip).map(e=>e.chapter),outFile);
		outStream.write("merged into "+outFile.getName()+"\n");
	};

	while(true)
	{
		let chapterMenuAction=await chapterMenu();

		try
		{
			switch(chapterMenuAction)
			{
				case "edit":
					await edit();
					break;
				case "merge":
					return merge();
					break;
				case "back":
					return;
					break;
			}
		}
		catch(error)
		{
			if(error)console.error(error)
		}
	}
}