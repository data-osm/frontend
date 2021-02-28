import { Component, OnInit } from '@angular/core';
import { groupCarteInterface, groupThematiqueInterface,groupInterface } from 'src/app/type/type';
import { environment } from 'src/environments/environment';
import * as $ from 'jquery'

@Component({
  selector: 'app-sidenave-left-secondaire',
  templateUrl: './sidenave-left-secondaire.component.html',
  styleUrls: ['./sidenave-left-secondaire.component.scss']
})
/**
 * Secondary component of the left sidenav. On top of the first one:
 * It is use to show details of a group thematique or a group carte
 */
export class SidenaveLeftSecondaireComponent implements OnInit {

  /**
   * Url of the backend
   */
  url_prefix:string = environment.url_prefix

  /**
   * The Group carte to display if it is not undefined : display all his cartes / sous-cartes
   */
  groupCarte:groupCarteInterface
  /**
   * The group thematique to display if it is not undefined : display all themes / sous-themes
   */
  groupThematique:groupThematiqueInterface
  /**
   * Goup active
   */
  activeGroup:groupInterface

  constructor() { }

  ngOnInit(): void {
  }

  /**
   * Display nothing
   * Set all groups to undefined
   */
  clearAllGroup(){
    this.groupCarte = undefined
    this.groupThematique = undefined
    this.activeGroup = undefined
  }

  /**
   * Set the group carte to display
   */
  setGroupCarte(groupCarte:groupCarteInterface){
    this.clearAllGroup()
    this.groupCarte = groupCarte
    let img = this.groupCarte.img
    if (groupCarte.principal) {
      img = '/assets/icones/fondsCarte.svg'
    }else{
      img = '/assets/icones/geobibliotheque.svg'
    }
    this.activeGroup = {
      nom:this.groupCarte.nom,
      img:img,
      color:environment.primaryColor
    }
  }

  /**
   * Set the group thematique to display
   */
  setGroupThematique(groupThematique:groupThematiqueInterface){
    this.clearAllGroup()
    this.groupThematique = groupThematique
    this.activeGroup = {
      nom:this.groupThematique.nom,
      img:environment.url_prefix+this.groupThematique.img,
      color:this.groupThematique.color,
    }
  }

  /**close window */
  close(){
    this.clearAllGroup()
    $('app-sidenave-left-secondaire').css('left','-260px')
  }

  open(){
    $('app-sidenave-left-secondaire').css('left','0px')
  }

  /**
   * Get the background color of the header
   * It is use by the app-vertical-toolbar comp for style
   */
  getBackgroundColor():string{
    return this.activeGroup?this.activeGroup.color:undefined
  }

}
