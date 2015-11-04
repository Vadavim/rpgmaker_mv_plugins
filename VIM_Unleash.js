//=============================================================================
// Vadavim - Unleash Skills
// VIM_Unleash.js
// Version: 1.0
//=============================================================================

var Imported = Imported || {};
Imported.VIM_Unleash = true;

var Vim = Vim || {};

//=============================================================================
/*:
 * @plugindesc v1.0 Allows for weapons and skills that randomly activate a different skill.
 * @author Vadavim
 *
 *
 * @param Debug
 * @desc Prints useful debug info to console when true
 * Default: false
 * @default false
 *
 * @param Luck Eval
 * @desc Custom code to evaluate when determining how luck influences
 * unleash chance
 * Default:
 * @default
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * If you've ever played a game like Golden Sun, you're probably familiar with
 * the concept of unleash skills. This allows you to give a weapon or skill
 * a certain chance of unleashing a different skill in its place when used.
 *
 * ============================================================================
 * Basic Use
 * ============================================================================
 * To add an unleash skill to a skill or weapon, add the following notetag:
 *
 * <unleash: skillID, chance>
 *
 * Where skillID is the id of the skill to be used, and chance is the percent
 * chance that the skill will activate (0 = 0%, 50 = 50%, etc)
 *
 * You can add as many unleash skills as you'd like using the notetag above.
 * The unleash skills will be processed in the order added until one of them
 * triggers. If none trigger, then the normal attack/skill is used instead.
 *
 * Unleash skills are checked for each equipped weapon when a character attacks.
 *
 * ============================================================================
 * Luck Factor
 * ============================================================================
 * You may have a user's luck affect the chance of triggering an unleash by
 * using the following format:
 *
 * <unleash: skillID, chance, difficulty>
 *
 * Where difficulty is the base amount of luck required to have the skill
 * activate at the normal rate specified.
 *
 * Luck that is lower or higher than this difficulty affects the chance to
 * unleash the skill via the following formula:
 *          chance * (1 + (luck - difficulty) / (luck + difficulty))
 *
 * ============================================================================
 * Custom Luck Factor
 * ============================================================================
 * If you would like to use your own formula for calculating how luck affects
 * unleash chance, you can use the Luck Eval parameter to evaluate it. The
 * following variables might be useful to you when doing so:
 *
 * user: refers to the actor using the unleash skill. You can access attributes
 * such as user.luk from this.
 *
 * diff: the difficulty of the unleash skill (0 if none is given in the notetag)
 *
 * chance: the base chance of activating the skill (represented as a fraction).
 *
 * Note that your final evaluated chance should probably be betweeen 0 and
 * 1 (where 0.0 = 0%, 0.5 = 50%, etc.)
 *
 * As an example, you could enter the following in Luck Eval:
 * chance + user.luk * 0.01 - diff * 0.01
 *
 * This would increase the base chance by 1% per point of luck, minus 1%
 * per point of difficulty that the unleash skill has.
 *
 * ============================================================================
 * Terms of Use
 * ============================================================================
 * You are free to use this script for any commercial or non-commercial game.
 * Credit is not necessary, but it's appreciated!
 *
 */
//=============================================================================

Vim.Unleash = Vim.Unleash || {};
Vim.param = PluginManager.parameters('VIM_Unleash');
Vim.param['Debug'] = String(Vim.param['Debug']);


//=============================================================================
// Game_Action
//=============================================================================
Vim.Unleash.Game_Action_setAttack = Game_Action.prototype.setSkill;
Game_Action.prototype.setAttack = function() {
    Vim.Unleash.Game_Action_setAttack.call(this, this.subject().attackUnleash());
};

Vim.Unleash.Game_Action_setSkill = Game_Action.prototype.setSkill;
Game_Action.prototype.setSkill = function(skillId) {
    var skill = $dataSkills[skillId];
    var success = Vim.Unleash.processUnleashTags(this.subject(), skill.note);
    if (success)
        this._item.setObject($dataSkills[success]);
    else
        Vim.Unleash.Game_Action_setSkill.call(this, skillId);
};


//=============================================================================
// Game_Actor
//=============================================================================
Game_Actor.prototype.attackUnleash = function() {
    var normalId = this.attackSkillId();
    if(this.hasNoWeapons()){
        return normalId;
    }

    // iterate over each weapon, testing to see if unleash skill procs
    for (var i = 0; len = this.weapons().length, i < len; i++){
        var weapon = this.weapons()[i];
        var success = Vim.Unleash.processUnleashTags(this, weapon.note);
        if (success)
            return success;
    }
    return normalId;
};


//=============================================================================
// Utilities
//=============================================================================
Vim.Unleash.processUnleashTags = function(user, notes) {
    if (!notes)
        return 0;
    var pattern = /<unleash:\s*(\d+),?\s*(\d+)?,?\s*(\d+)?\s*>/ig;
    var match;

    // iterate over all unleash notetags
    while (match = pattern.exec(notes)) {
        var id = match[1];
        var chance = match[2] || 50;
        chance = parseInt(chance) / 100;
        var diff = match[3] || 0;
        diff = parseInt(diff);

        // base chance modified by luck unless there was no difficulty set
        var mod = diff ? 1 + (user.luk - diff) / (user.luk + diff) : 1;
        var modified_chance = chance * mod;

        // override formula if custom eval provided
        if (Vim.param['Luck Eval']) {
            modified_chance = eval(Vim.param['Luck Eval']);
        }

        if (eval(Vim.param['Debug']))
            console.log("Unleash Skill: " + id + ", Base Chance: " + chance +
                ", Modified Chance: " + modified_chance);
        if (id && Math.random() <= modified_chance)
            return parseInt(id);
    }
    return 0;
};