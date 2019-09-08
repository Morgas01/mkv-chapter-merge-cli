let {Select}=require("enquirer");

module.exports=class PathPrompt extends Select
{
	constructor(options={})
	{
		options.multiple=false;
		super(options);
	}

	left()
	{
		let index=this.focused.choices.indexOf(this.focused.value);
		let nextIndex=(this.focused.choices.length+index-1)%this.focused.choices.length;
		this.focused.value=this.focused.choices[nextIndex];
		return this.render();
	}
	right()
	{
		let index=this.focused.choices.indexOf(this.focused.value);
		let nextIndex=(index+1)%this.focused.choices.length;
		this.focused.value=this.focused.choices[nextIndex];
		return this.render();
	}
	async toChoices(value,parent)
	{
		this.state.loadingChoices = true;
		let choices = await Promise.all(value.map(v=>this.toChoice(v)));
		for(let choice of choices)
		{
			choice.value=choice.choices.find(child=>child.selected)||choice.choices[0];
		}
		this.state.loadingChoices = false;
		return choices;
	}
	async toChoice(ele, i, parent) {
		let choice=await super.toChoice(ele,i,parent);
		choice.choices=await Promise.all((choice.choices||[]).map((c,i)=>this.toChoice(c,i,choice)));
		return choice;
	}
	choiceMessage(choice, i)
	{
		let message = choice.message+this.choiceSeparator();
		let choices=choice.choices||[];
		message+=choices.map(child=>
		{
			let childMessage=child.message;
			if(child===choice.value) childMessage=this.styles.highlight(childMessage);
			return childMessage;
		}).join("\t");
		return message;
	}
	choiceSeparator()
	{
    	return ':\t';
	}
	result()
	{
		let result={};
		for( let choice of this.choices )
		{
			if(!choice.value) continue;
			result[choice.name]=choice.value.value;
		}
		return result;
	}
};